import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TIMEOUT_MS = 10 * 60 * 1000;

function runClaude(args, input, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => reject(new Error(`claude 실행 실패: ${error.message}`)));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude 종료 코드 ${code}: ${(stderr || stdout).slice(0, 300)}`));
    });

    child.stdin.end(input);
  });
}

export async function requestWithClaudeCode(model, systemPrompt, prompt) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-news-'));
  const systemPromptFile = path.join(workDir, 'system-prompt.md');
  fs.writeFileSync(systemPromptFile, systemPrompt);

  try {
    const stdout = await runClaude(
      [
        '-p',
        '--output-format',
        'json',
        '--model',
        model,
        '--system-prompt-file',
        systemPromptFile,
        '--tools',
        process.platform === 'win32' ? '""' : '',
        '--no-session-persistence',
      ],
      prompt,
      workDir
    );

    const data = JSON.parse(stdout);
    if (data.is_error) throw new Error(data.result ?? 'Claude Code 응답 오류');

    const usage = data.usage ?? {};
    const promptTokens =
      (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);

    return {
      text: data.result,
      usage: { prompt_tokens: promptTokens, completion_tokens: usage.output_tokens },
      model: `claude-code/${model}`,
    };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
