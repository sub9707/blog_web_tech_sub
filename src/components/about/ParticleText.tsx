'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const WORDS = ['TypeScript', 'React', 'Next.js', 'DevOps', 'Node.js', 'Network', 'CS', 'Infrastructure'];
const PARTICLE_COUNT = 2500;
const HOLD_MS = 2800;
const TRANSITION_MS = 1400;

function sampleWordPositions(word: string, count: number): Float32Array {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 180;
  const ctx = cvs.getContext('2d')!;

  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.fillStyle = '#000';
  ctx.font = `bold 72px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, cvs.width / 2, cvs.height / 2);

  const { data } = ctx.getImageData(0, 0, cvs.width, cvs.height);
  const candidates: [number, number][] = [];

  for (let y = 0; y < cvs.height; y += 2) {
    for (let x = 0; x < cvs.width; x += 2) {
      if (data[(y * cvs.width + x) * 4 + 3] > 120) {
        candidates.push([x, y]);
      }
    }
  }

  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [px, py] = candidates[Math.floor(Math.random() * candidates.length)];
    out[i * 3]     = ((px / cvs.width) - 0.5) * 5;
    out[i * 3 + 1] = -((py / cvs.height) - 0.5) * 2.5;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }
  return out;
}

function randomScatter(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 0.8 + Math.random() * 1.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    out[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    out[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    out[i * 3 + 2] = r * Math.cos(phi);
  }
  return out;
}

export default function ParticleText() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Geometry
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scatter = randomScatter(PARTICLE_COUNT);
    positions.set(scatter);

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    geo.setAttribute('position', posAttr);

    const mat = new THREE.PointsMaterial({
      color: 0x1a1a1a,
      size: 0.03,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // State
    let wordIdx = 0;
    type Phase = 'forming' | 'holding' | 'dispersing';
    let phase: Phase = 'forming';
    let phaseStart = Date.now();
    let target = sampleWordPositions(WORDS[0], PARTICLE_COUNT);

    // Rotation
    let rotX = 0, rotY = 0;
    let tRotX = 0, tRotY = 0;
    let dragging = false;
    let prevX = 0, prevY = 0;

    // Hover (NDC)
    let hoverX = 9999, hoverY = 9999;

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      hoverX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      hoverY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!dragging) return;
      tRotY += (e.clientX - prevX) * 0.006;
      tRotX += (e.clientY - prevY) * 0.006;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      tRotX = 0;
      tRotY = 0;
    };
    const onMouseLeave = () => {
      hoverX = 9999;
      hoverY = 9999;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);

    // Map hover NDC → approximate world XY on z=0 plane
    const fov = (60 * Math.PI) / 180;
    const halfH = Math.tan(fov / 2) * camera.position.z;
    const halfW = halfH * (w / h);

    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = Date.now();
      const elapsed = now - phaseStart;
      const pos = posAttr.array as Float32Array;

      // Phase transitions
      if (phase === 'forming' && elapsed > TRANSITION_MS) {
        phase = 'holding';
        phaseStart = now;
      } else if (phase === 'holding' && elapsed > HOLD_MS) {
        phase = 'dispersing';
        phaseStart = now;
        target = randomScatter(PARTICLE_COUNT);
      } else if (phase === 'dispersing' && elapsed > TRANSITION_MS) {
        wordIdx = (wordIdx + 1) % WORDS.length;
        target = sampleWordPositions(WORDS[wordIdx], PARTICLE_COUNT);
        phase = 'forming';
        phaseStart = now;
      }

      const baseSpeed = phase === 'forming' ? 0.055 : phase === 'dispersing' ? 0.025 : 0.015;

      // Hover world position
      const hwx = hoverX * halfW;
      const hwy = hoverY * halfH;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2;

        // Hover repulsion
        const dx = pos[ix] - hwx;
        const dy = pos[iy] - hwy;
        const dist2 = dx * dx + dy * dy;
        let rx = 0, ry = 0;
        if (dist2 < 0.36 && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          const force = (0.6 - dist) * 0.06;
          rx = (dx / dist) * force;
          ry = (dy / dist) * force;
        }

        // During holding, boost return speed for disturbed particles
        let speed = baseSpeed;
        if (phase === 'holding') {
          const ex = pos[ix] - target[ix];
          const ey = pos[iy] - target[iy];
          if (ex * ex + ey * ey > 0.02) speed = 0.1;
        }

        pos[ix]  += (target[ix]  - pos[ix])  * speed + rx;
        pos[iy]  += (target[iy]  - pos[iy])  * speed + ry;
        pos[iz]  += (target[iz]  - pos[iz])  * speed;
      }

      posAttr.needsUpdate = true;

      // Smooth rotation lerp
      rotX += (tRotX - rotX) * 0.08;
      rotY += (tRotY - rotY) * 0.08;
      points.rotation.x = rotX;
      points.rotation.y = rotY;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!el) return;
      const nw = el.clientWidth, nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
    />
  );
}
