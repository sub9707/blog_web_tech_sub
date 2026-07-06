---
title: "상태 처리의 계보"
date: "2026-06-26"
description: "웹 프론트엔드의 상태 관리가 어떻게 진화해왔는지 알아보자"
tags: ["state-management", "react", "redux", "zustand", "jotai", "react-query", "history"]
thumbnail: "/assets/thumbnails/3fbfff57-890e-45bc-bf9d-8828a6536226.png"
---

React나 여타 프론트엔드 쪽에서 변수나 전역변수로 특정 값을 기억하려고 할 때, props drilling이나 관리의 어려움으로 인해 우리는 상태 관리 툴을 사용한다.

상태 관리 툴에는 다양한 방식들이 있으며, 선호하는 방식에 따라, 또 팀 내 규율에 따라 여러 방법들을 채택하곤 하는데, 프로젝트 규모나 성격에 따라 효율적인 관리 방법을 생각해보기 위해 State의 기저부터 최근 동향까지 알아보는 시간을 가져보도록 하겠다.

<br/>

# 파트 1: 상태(state)가 뭔지부터 짚어보자

## 상태의 정의

상태(State)란 어플리케이션이 특정 시점에 기억해야 하는 데이터의 집합이다.

사용자가 로그인했는가. 장바구니에 무엇이 담겼는가. 어떤 탭이 선택되어 있는가. 서버에서 불러온 데이터는 무엇인가. 폼에 입력된 값은 무엇인가.

이 모든 것이 상태다.

상태는 크게 두 가지 축으로 분류할 수 있다.

**어디에 존재하는가**
- 클라이언트 상태: 브라우저 메모리 안에만 존재한다. 새로고침하면 사라진다.
- 서버 상태: 서버의 데이터베이스에 존재한다. 클라이언트는 그것의 스냅샷을 가져온다.
- URL 상태: 주소창에 존재한다. 새로고침해도 유지되고 공유 가능하다.
- 영속 상태: localStorage, sessionStorage, IndexedDB처럼 브라우저에 저장된다.

**얼마나 광범위한가**
- 지역 상태(Local State): 단일 컴포넌트 안에서만 의미 있다.
- 공유 상태(Shared State): 여러 컴포넌트가 동일한 데이터를 참조해야 한다.
- 전역 상태(Global State): 어플리케이션 전체에서 접근 가능해야 한다.

이 개념들이 왜 중요한가? 역사를 이해하는 데 반드시 필요하기 때문이다. 각 시대의 문제는 결국 이 분류 중 어느 것을 어떻게 다루느냐에서 비롯됐다.

<br/>

# 파트 2: 웹의 태동기 — 상태가 없던 시절

## 정적 웹과 서버 중심 아키텍처 (1991~2000)

월드 와이드 웹이 처음 등장했을 때, 웹 페이지는 말 그대로 문서였다. Tim Berners-Lee가 CERN에서 설계한 HTML은 하이퍼텍스트 문서를 연결하기 위한 마크업 언어였다. 그 안에 상태라는 개념이 들어설 자리는 없었다.

사용자가 링크를 클릭하면 서버에 요청이 가고, 서버는 새로운 HTML 문서를 반환한다. 브라우저는 그것을 렌더링한다. 끝이다.

상태 관리의 문제 자체가 존재하지 않았다. 상태는 전부 서버에 있었고, 클라이언트는 단순한 렌더러에 불과했다.

## 폼과 세션의 등장

웹이 조금씩 동적인 콘텐츠를 다루기 시작했다. 검색창에 텍스트를 입력하고 서버로 전송하는 폼이 생겼다. 로그인 기능이 필요해졌다.

그런데 HTTP는 상태가 없는(stateless) 프로토콜이다. 서버는 각 요청을 독립적으로 처리한다. 어제 로그인했던 사용자가 오늘 요청을 보내도, 서버 입장에서는 그냥 낯선 요청일 뿐이다.

이 문제를 해결하기 위해 두 가지 메커니즘이 탄생했다.

**쿠키(Cookie)**가 1994년 Netscape의 Lou Montulli에 의해 발명됐다. 서버가 응답할 때 작은 데이터 조각을 브라우저에 저장시키고, 브라우저는 이후 요청마다 그것을 자동으로 첨부한다. 로그인 상태가 쿠키에 저장된 세션 ID를 통해 유지되기 시작했다.

**서버 사이드 세션**이 발전했다. 서버 메모리나 데이터베이스에 사용자의 상태를 저장하고, 쿠키의 세션 ID로 그것을 참조한다. PHP, ASP, JSP가 이 방식으로 동작했다.

이 시대의 핵심은 이것이다. **상태는 서버에 있다.** 클라이언트는 렌더링만 한다. 이 패러다임은 매우 단순하고 강력했지만, 한 가지 거대한 한계가 있었다. 사용자가 무언가를 할 때마다 페이지 전체가 새로고침되어야 했다.

<br/>

# 파트 3: 자바스크립트의 등장과 DOM 조작의 시대

## JavaScript의 탄생 (1995)

1995년, Netscape의 Brendan Eich가 10일 만에 JavaScript를 만들었다. 처음 이름은 Mocha였다가 LiveScript를 거쳐 JavaScript가 됐다. Java의 인기에 편승하기 위한 마케팅 결정이었다.

JavaScript의 초기 역할은 단순했다. 폼 검증, 간단한 애니메이션, 사용자 인터랙션에 즉시 반응하는 작은 스크립트들. 그러나 이것이 클라이언트 상태 관리의 서막이었다.

```javascript
// 초기 JavaScript 코드의 전형적인 모습
var isMenuOpen = false;

function toggleMenu() {
  if (isMenuOpen) {
    document.getElementById('menu').style.display = 'none';
    isMenuOpen = false;
  } else {
    document.getElementById('menu').style.display = 'block';
    isMenuOpen = true;
  }
}
```

`isMenuOpen`이라는 전역 변수. 이것이 클라이언트 상태의 원형이다.

## jQuery 시대와 DOM 중심 상태 (2006~2012)

2006년 John Resig이 jQuery를 공개했다. 브라우저 호환성 지옥을 해결해주는 이 라이브러리는 순식간에 웹 개발의 표준이 됐다.

jQuery 시대에 "상태"를 관리하는 방식은 주로 두 가지였다.

**DOM 자체가 상태였다.**

```javascript
// DOM에서 현재 상태를 읽어온다
function isLoggedIn() {
  return $('#user-name').text() !== '';
}

// DOM을 변경해서 상태를 업데이트한다
function login(userName) {
  $('#user-name').text(userName);
  $('#login-btn').hide();
  $('#logout-btn').show();
}
```

DOM의 현재 모양이 곧 상태였다. DOM을 읽어서 상태를 파악하고, DOM을 조작해서 상태를 변경했다. 이 접근법은 직관적이었지만 어플리케이션이 커질수록 재앙이 됐다.

**전역 변수와 전역 객체**

```javascript
// 전형적인 jQuery 시대 코드
var App = {
  currentUser: null,
  cart: [],
  selectedTab: 'home',
  
  setUser: function(user) {
    this.currentUser = user;
    this.render();
  },
  
  render: function() {
    // DOM을 수동으로 업데이트
    if (this.currentUser) {
      $('#user-info').html(this.currentUser.name);
    }
  }
};
```

전역 객체 `App` 안에 상태를 모아두는 패턴. 임시방편이었지만 당시로서는 최선이었다.

## 이 시대의 근본적 문제

jQuery 시대의 상태 관리가 어려웠던 이유는 구조적이었다.

**상태와 뷰의 동기화 문제.** 상태가 바뀌면 그에 맞는 DOM을 수동으로 업데이트해야 했다. 어떤 DOM 요소가 어떤 상태에 의존하는지 추적하는 것은 개발자의 몫이었다. 어플리케이션이 복잡해지면 이것은 불가능에 가까워졌다.

**상태의 분산.** 전역 변수, DOM 속성, 로컬 변수, 클로저 안의 변수들. 상태가 코드 곳곳에 흩어져 있었다. 어떤 코드가 어떤 상태를 바꾸는지 추적하기가 매우 어려웠다.

**예측 불가능성.** 어떤 함수가 DOM을 어떻게 바꿀지 예측하기 어려웠다. 이벤트 핸들러들이 서로 충돌하는 사이드 이펙트를 만들어냈다.

<br/>

# 파트 4: AJAX 혁명과 SPA의 시작

## AJAX의 등장 (2005)

2005년, Jesse James Garrett이 "Ajax: A New Approach to Web Applications"라는 글을 발표했다. Asynchronous JavaScript And XML의 줄임말인 AJAX는 사실 새로운 기술이 아니었다. `XMLHttpRequest`는 이미 1999년 Internet Explorer 5에서 등장했다.

그러나 Garrett의 글이 개념을 정리하고 이름을 붙임으로써, 개발자들이 이것을 적극적으로 활용하기 시작했다. Google Maps와 Gmail이 AJAX의 가능성을 전 세계에 보여줬다.

페이지를 새로고침하지 않고도 서버에서 데이터를 가져와 화면 일부만 업데이트할 수 있게 됐다. 이것은 웹 어플리케이션의 개념 자체를 바꿔놓았다.

```javascript
// AJAX 요청의 원형
var xhr = new XMLHttpRequest();
xhr.open('GET', '/api/posts', true);
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    var posts = JSON.parse(xhr.responseText);
    renderPosts(posts); // DOM 업데이트
  }
};
xhr.send();
```

이제 클라이언트는 단순한 렌더러가 아니었다. 서버에서 데이터를 가져오고, 그 데이터를 화면에 반영하고, 사용자 인터랙션에 반응하는 복잡한 로직을 담당하게 됐다.

그리고 이와 함께 **서버 상태의 클라이언트 캐싱 문제**가 처음으로 등장했다. 서버에서 가져온 데이터를 어디에 저장할 것인가? 언제 새로 가져올 것인가? 여러 컴포넌트가 같은 데이터를 각자 다른 시점에 가져왔을 때 어떻게 동기화할 것인가?

## Backbone.js — 첫 번째 구조 (2010)

AJAX가 보편화되면서 클라이언트 코드가 폭발적으로 복잡해졌다. 체계 없이 쌓인 jQuery 코드는 스파게티가 됐다.

2010년, Jeremy Ashkenas가 Backbone.js를 공개했다. 이것은 클라이언트 사이드 JavaScript에 MVC(Model-View-Controller) 패턴을 도입한 최초의 주류 라이브러리였다.

```javascript
// Backbone.js의 Model
var Todo = Backbone.Model.extend({
  defaults: {
    title: '',
    completed: false
  }
});

// Backbone.js의 Collection
var TodoList = Backbone.Collection.extend({
  model: Todo,
  url: '/api/todos'
});

// Backbone.js의 View
var TodoView = Backbone.View.extend({
  events: {
    'click .toggle': 'toggleDone'
  },
  
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },
  
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },
  
  toggleDone: function() {
    this.model.toggle();
  }
});
```

Backbone의 핵심 혁신은 **이벤트 기반 상태 동기화**였다. Model이 변경되면 이벤트를 발생시키고, View가 그 이벤트를 구독해서 자신을 업데이트한다. 상태(Model)와 뷰(View)의 관계가 명시적이 됐다.

그러나 Backbone에도 한계가 있었다. View와 Model 사이의 양방향 바인딩이 복잡해질 수 있었고, 대규모 어플리케이션에서 이벤트 흐름을 추적하기 어려웠다. 그리고 여전히 DOM 조작은 개발자가 직접 해야 했다.

## Knockout.js와 Angular 1 — 양방향 바인딩의 시대 (2010~2012)

같은 시기에 다른 접근법들도 등장했다.

**Knockout.js (2010)**는 MVVM(Model-View-ViewModel) 패턴과 Observable을 도입했다.

```javascript
// Knockout.js
function AppViewModel() {
  this.firstName = ko.observable('Bob');
  this.lastName = ko.observable('Smith');
  
  this.fullName = ko.computed(function() {
    return this.firstName() + " " + this.lastName();
  }, this);
}

ko.applyBindings(new AppViewModel());
```

```html
<p>First name: <input data-bind="value: firstName" /></p>
<p>Last name: <input data-bind="value: lastName" /></p>
<p>Full name: <strong data-bind="text: fullName"></strong></p>
```

`ko.observable()`로 만든 값이 변경되면 그것을 참조하는 모든 UI가 자동으로 업데이트됐다. 이것이 **반응형(Reactive) 상태 관리**의 원형이다.

**AngularJS (2010)**는 Google이 공개한 MVC 프레임워크로, 양방향 데이터 바인딩이 핵심이었다.

```html
<div ng-app="myApp" ng-controller="myCtrl">
  <input ng-model="name" />
  <p>Hello, {{name}}!</p>
</div>
```

```javascript
angular.module('myApp', [])
  .controller('myCtrl', function($scope) {
    $scope.name = "World";
  });
```

`ng-model`로 묶인 input과 `{{name}}`이 자동으로 동기화됐다. 개발자는 DOM 조작을 직접 하지 않아도 됐다.

그러나 AngularJS의 양방향 바인딩은 Dirty Checking이라는 메커니즘으로 구현됐다. Angular가 주기적으로 모든 바인딩을 검사해서 변경이 있으면 업데이트하는 방식이었다. 간단한 어플리케이션에서는 문제가 없었지만, 복잡한 어플리케이션에서는 성능이 심각하게 저하됐다. 수천 개의 바인딩이 있을 때 Dirty Checking은 악몽이었다.

<br/>

# 파트 5: React와 단방향 데이터 흐름의 혁명

## React의 등장 (2013)

2013년 5월, Facebook의 Jordan Walke가 JSConf US에서 React를 공개했다. 청중의 반응은 냉담했다. HTML을 JavaScript 안에 섞어 쓰는 JSX가 끔찍해 보였기 때문이다.

그러나 React가 제안한 아이디어는 근본적으로 달랐다.

**UI는 상태의 함수다(UI = f(state)).**

UI를 조작하는 대신, 상태가 주어졌을 때 어떤 UI가 나와야 하는지 선언한다. 상태가 바뀌면 React가 Virtual DOM을 이용해 최소한의 DOM 변경을 계산하고 적용한다.

```jsx
// React의 핵심 사상
function Counter({ count }) {
  return <div>{count}</div>;
}
```

이 함수는 count라는 숫자를 받아 div를 반환한다. 언제 호출해도 같은 입력이면 같은 출력이다. 순수 함수다.

React의 상태 관리 철학은 **단방향 데이터 흐름(Unidirectional Data Flow)**이었다.

```
State → View → User Action → State 변경 → View 업데이트
```

상태는 위에서 아래로만 흐른다. 자식 컴포넌트는 부모에게서 props를 받고, 이벤트를 통해서만 부모에게 신호를 보낸다.

```jsx
// 단방향 데이터 흐름
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
  
  render() {
    return (
      <div>
        <span>{this.state.count}</span>
        <button onClick={() => this.increment()}>+</button>
      </div>
    );
  }
}
```

`this.state`에 상태를 저장하고, `this.setState()`로만 변경할 수 있다. 상태 변경은 예측 가능하고 추적 가능하다. 이것이 AngularJS의 양방향 바인딩과 근본적으로 다른 점이었다.

## Props Drilling의 공포

React 초기에는 컴포넌트 트리가 깊어질수록 심각한 문제가 생겼다.

```jsx
// Props Drilling의 전형적인 예시
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />;
}

function Sidebar({ user, setUser }) {
  return <UserProfile user={user} setUser={setUser} />;
}

function UserProfile({ user, setUser }) {
  // 드디어 user를 사용하는 컴포넌트
  return <div>{user?.name}</div>;
}
```

중간 컴포넌트들은 `user`나 `setUser`를 직접 사용하지도 않으면서 아래로 전달하기만 했다. 이것을 Props Drilling이라고 부른다. 어플리케이션이 커질수록 이 패턴은 유지보수를 불가능하게 만들었다.

이 문제를 해결하기 위한 두 가지 방향이 동시에 발전했다. Context API라는 React 내장 기능과, 외부 상태 관리 라이브러리들이었다.

<br/>

# 파트 6: Flux와 Redux — 상태 관리의 황금기

## Flux 아키텍처 (2014)

Props Drilling이 한계에 달하던 2014년, Facebook이 Flux라는 아키텍처 패턴을 공개했다. 라이브러리가 아니라 패턴이었다.

Flux의 핵심은 **단방향 데이터 흐름의 강제화**였다.

```
Action → Dispatcher → Store → View → Action → ...
```

```javascript
// Flux의 개념적 구조
// 1. Action: 어떤 일이 일어났는가
const incrementAction = {
  type: 'INCREMENT',
  payload: { amount: 1 }
};

// 2. Dispatcher: 모든 Action의 중앙 허브
AppDispatcher.dispatch(incrementAction);

// 3. Store: 상태와 비즈니스 로직
class CounterStore extends EventEmitter {
  constructor() {
    super();
    this.count = 0;
    AppDispatcher.register(this.handleAction.bind(this));
  }
  
  handleAction(action) {
    if (action.type === 'INCREMENT') {
      this.count += action.payload.amount;
      this.emit('change');
    }
  }
  
  getCount() {
    return this.count;
  }
}

// 4. View: Store를 구독
counterStore.on('change', () => {
  setCount(counterStore.getCount());
});
```

Flux는 상태가 어떤 경로로 바뀌는지 명확하게 만들었다. Action이 발생하면 Dispatcher를 거쳐 Store에 전달되고, Store가 상태를 업데이트하면 View가 반응한다. 어디서 무슨 일이 일어나는지 항상 추적 가능했다.

그러나 Flux의 공식 구현체는 다소 투박했다. 여러 Store가 존재할 수 있었고, Store들 사이의 의존 관계 관리가 복잡했다.

## Redux의 등장 (2015)

2015년 Dan Abramov와 Andrew Clark이 Redux를 공개했다. Flux에서 영감을 받았지만, Elm 언어의 아키텍처에서도 많은 것을 가져왔다.

Redux는 세 가지 원칙으로 시작한다.

**1. 단일 진실의 원천(Single Source of Truth)**
전체 어플리케이션의 상태를 하나의 JavaScript 객체(Store)에 저장한다.

```javascript
// 전체 앱의 상태가 하나의 트리
const state = {
  user: { id: 1, name: 'John', isLoggedIn: true },
  posts: [...],
  ui: { sidebarOpen: false, theme: 'dark' }
};
```

**2. 상태는 읽기 전용(State is Read-Only)**
상태를 직접 수정하는 것은 금지된다. 오직 Action을 통해서만 변경할 수 있다.

```javascript
// 직접 수정 금지
// state.user.name = 'Jane'; ← 이것은 Redux에서 금지

// Action을 통해서만 변경 가능
store.dispatch({ type: 'UPDATE_USER_NAME', payload: 'Jane' });
```

**3. 변경은 순수 함수로(Changes are Made with Pure Functions)**
상태 변경 로직은 Reducer라는 순수 함수로 작성된다.

```javascript
// Reducer: 이전 상태와 Action을 받아 새로운 상태를 반환하는 순수 함수
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
}

// Store 생성
const store = createStore(counterReducer);

// 사용
store.dispatch({ type: 'INCREMENT' });
console.log(store.getState()); // { count: 1 }
```

Redux의 위대함은 **예측 가능성**과 **개발자 경험**에 있었다. 모든 상태 변경이 Action이라는 명시적인 이벤트를 통해 이루어지기 때문에, Redux DevTools를 이용하면 Action들을 시간 순서대로 확인하고, 심지어 되감기(Time Travel Debugging)도 가능했다.

```javascript
// Redux DevTools로 가능한 것들
// - 모든 Action의 이력 확인
// - 각 Action 이후 상태 스냅샷
// - 과거 상태로 되돌아가기
// - Action 재실행
```

## Redux의 전성기

Redux는 순식간에 React 생태계의 표준이 됐다. 규모가 있는 React 어플리케이션이라면 거의 무조건 Redux를 사용했다.

`react-redux`의 `connect()` 함수를 통해 컴포넌트를 Store에 연결했다.

```javascript
// 전통적인 Redux + react-redux 패턴
const mapStateToProps = (state) => ({
  count: state.counter.count,
  user: state.user.currentUser
});

const mapDispatchToProps = (dispatch) => ({
  increment: () => dispatch({ type: 'INCREMENT' }),
  decrement: () => dispatch({ type: 'DECREMENT' })
});

export default connect(mapStateToProps, mapDispatchToProps)(Counter);
```

그러나 Redux에는 문제가 있었다. 아니, 정확히는 Redux 자체보다 Redux를 실무에서 사용하는 방식에 문제가 있었다.

## Redux의 보일러플레이트 지옥

상태 하나를 추가하려면 너무 많은 코드를 작성해야 했다.

```javascript
// 하나의 기능을 위해 필요한 코드들

// 1. Action Types
const FETCH_POSTS_REQUEST = 'FETCH_POSTS_REQUEST';
const FETCH_POSTS_SUCCESS = 'FETCH_POSTS_SUCCESS';
const FETCH_POSTS_FAILURE = 'FETCH_POSTS_FAILURE';

// 2. Action Creators
const fetchPostsRequest = () => ({ type: FETCH_POSTS_REQUEST });
const fetchPostsSuccess = (posts) => ({ type: FETCH_POSTS_SUCCESS, payload: posts });
const fetchPostsFailure = (error) => ({ type: FETCH_POSTS_FAILURE, error });

// 3. Thunk (비동기 처리)
const fetchPosts = () => async (dispatch) => {
  dispatch(fetchPostsRequest());
  try {
    const posts = await api.getPosts();
    dispatch(fetchPostsSuccess(posts));
  } catch (error) {
    dispatch(fetchPostsFailure(error));
  }
};

// 4. Reducer
const initialState = { posts: [], loading: false, error: null };
function postsReducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_POSTS_REQUEST:
      return { ...state, loading: true };
    case FETCH_POSTS_SUCCESS:
      return { ...state, loading: false, posts: action.payload };
    case FETCH_POSTS_FAILURE:
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

// 5. Selector
const selectPosts = (state) => state.posts.posts;
const selectPostsLoading = (state) => state.posts.loading;
```

단순한 API 호출 하나를 위해 이 모든 코드가 필요했다. 실제 프로젝트에서는 이 파일들이 `actions/`, `reducers/`, `selectors/`, `types/` 폴더에 분산됐다. 하나의 기능을 이해하려면 여러 파일을 넘나들어야 했다.

또한 Redux는 **비동기 처리를 기본으로 지원하지 않았다**. `redux-thunk`나 `redux-saga`, `redux-observable` 같은 미들웨어를 선택해야 했다. 각각 다른 패러다임을 요구했다.

```javascript
// redux-thunk: 함수를 dispatch
const fetchUser = (id) => (dispatch) => {
  dispatch(fetchUserRequest());
  return fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(user => dispatch(fetchUserSuccess(user)));
};

// redux-saga: Generator 기반
function* fetchUserSaga(action) {
  try {
    yield put(fetchUserRequest());
    const user = yield call(api.getUser, action.id);
    yield put(fetchUserSuccess(user));
  } catch (e) {
    yield put(fetchUserFailure(e.message));
  }
}
```

redux-saga는 강력했지만 Generator 문법이 러닝 커브를 크게 높였다.

## MobX — 반응형의 귀환 (2015)

Redux가 강세를 보이던 같은 시기, Michel Weststrate가 MobX를 공개했다. MobX는 완전히 다른 철학을 가졌다.

```javascript
// MobX의 접근법
import { observable, action, computed, makeObservable } from 'mobx';

class CounterStore {
  count = 0;
  
  constructor() {
    makeObservable(this, {
      count: observable,
      increment: action,
      decrement: action,
      doubled: computed
    });
  }
  
  increment() {
    this.count++;
  }
  
  decrement() {
    this.count--;
  }
  
  get doubled() {
    return this.count * 2;
  }
}
```

MobX는 `observable`로 표시된 값이 바뀌면 그것을 참조하는 모든 컴포넌트가 자동으로 업데이트됐다. Knockout.js의 철학과 유사했지만 훨씬 세련된 형태였다.

Redux vs MobX의 논쟁은 오랫동안 지속됐다.

| Redux | MobX |
|-------|-------|
| 명시적인 Action | 직접 상태 변경 |
| 보일러플레이트 많음 | 코드 간결 |
| 예측 가능성 높음 | 자유도 높음 |
| 디버깅 용이 | 러닝 커브 낮음 |
| 순수 함수 강제 | OOP 친화적 |

<br/>

# 파트 7: Context API와 Hooks의 등장

## React Context의 진화

React에는 초기부터 Context라는 개념이 있었지만, 오랫동안 불안정하다고 공식적으로 인정됐다. "사용하지 마세요"라고 문서에 적혀 있을 정도였다.

2018년 React 16.3에서 새로운 Context API가 정식으로 출시됐다.

```jsx
// React Context API
const ThemeContext = React.createContext('light');
const UserContext = React.createContext(null);

function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <UserContext.Provider value={{ user, setUser }}>
        <MainContent />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

// 어느 깊이에서든 직접 접근 가능
function UserProfile() {
  const { user } = useContext(UserContext);
  return <div>{user?.name}</div>;
}
```

Props Drilling 없이 컴포넌트 트리를 건너뛰어 상태를 전달할 수 있게 됐다. 많은 개발자들이 "이제 Redux가 필요 없겠다"고 생각했다.

그러나 Context API에는 치명적인 성능 문제가 있었다. Context 값이 변경되면 그 Context를 사용하는 **모든** 컴포넌트가 리렌더링됐다. 어떤 값이 실제로 필요한지와 무관하게.

```jsx
// 성능 문제의 예시
const AppContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  
  // 이것들을 하나의 Context에 묶으면
  // theme이 바뀔 때 user 정보만 필요한 컴포넌트도 리렌더링된다
  return (
    <AppContext.Provider value={{ user, theme, notifications, setUser, setTheme, setNotifications }}>
      <App />
    </AppContext.Provider>
  );
}
```

Context를 분리하면 어느 정도 해결할 수 있었지만, 세밀한 최적화가 어려웠다.

## React Hooks (2018) — 상태 관리의 지각변동

2018년 10월, Dan Abramov가 React Conf에서 Hooks를 발표했다. 청중의 반응은 이번엔 달랐다. 실시간으로 경탄의 소리가 터져나왔다.

Hooks는 클래스 컴포넌트 없이도 상태와 생명주기를 다룰 수 있게 해줬다.

```jsx
// 클래스 컴포넌트
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.handleClick = this.handleClick.bind(this);
  }
  
  componentDidMount() {
    document.title = `Count: ${this.state.count}`;
  }
  
  componentDidUpdate() {
    document.title = `Count: ${this.state.count}`;
  }
  
  handleClick() {
    this.setState(prev => ({ count: prev.count + 1 }));
  }
  
  render() {
    return <button onClick={this.handleClick}>{this.state.count}</button>;
  }
}

// Hooks로 변환
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

코드가 극적으로 간결해졌다. 그러나 Hooks가 상태 관리에 미친 더 큰 영향은 **커스텀 훅**이었다.

```jsx
// 재사용 가능한 상태 로직을 커스텀 훅으로 추출
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset };
}

// 어느 컴포넌트에서든 재사용
function CounterA() {
  const { count, increment } = useCounter();
  return <button onClick={increment}>{count}</button>;
}

function CounterB() {
  const { count, decrement } = useCounter(100);
  return <button onClick={decrement}>{count}</button>;
}
```

상태 로직을 컴포넌트와 분리해서 재사용할 수 있게 됐다. 이것은 Higher Order Component나 Render Props 패턴이 해결하려던 문제를 훨씬 우아하게 풀었다.

`useReducer`의 등장도 의미 있었다.

```jsx
// useReducer: 컴포넌트 레벨의 Redux
function counterReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'RESET':
      return { count: 0 };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });
  
  return (
    <div>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </div>
  );
}
```

Redux의 패턴을 전역 Store 없이 컴포넌트 내에서 사용할 수 있게 됐다.

<br/>

# 파트 8: 상태 관리 라이브러리의 재편

## Redux Toolkit (2019) — Redux의 구원

Redux 팀은 보일러플레이트 문제를 인정하고 2019년 Redux Toolkit을 공개했다. 이것은 Redux의 공식 권장 방식이 됐다.

```javascript
// Redux Toolkit의 createSlice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 비동기 처리도 간결하게
const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  const response = await fetch('/api/posts');
  return response.json();
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    addPost: (state, action) => {
      // Immer가 내장되어 있어 직접 변경하는 것처럼 쓸 수 있다
      state.items.push(action.payload);
    },
    removePost: (state, action) => {
      state.items = state.items.filter(p => p.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { addPost, removePost } = postsSlice.actions;
export default postsSlice.reducer;
```

Immer를 내장해서 불변성을 유지하면서도 마치 직접 변경하는 것처럼 코드를 쓸 수 있게 됐다. `createAsyncThunk`로 비동기 처리도 간결해졌다.

보일러플레이트가 대폭 줄었다. 그러나 여전히 Redux를 배우는 데 상당한 시간이 필요했다.

## Zustand — 단순함의 미학 (2019)

같은 해, Jotai와 Valtio를 만든 Daishi Kato가 속한 pmndrs(Poimandres) 팀에서 Zustand를 공개했다.

Zustand는 급진적으로 단순했다.

```javascript
// Zustand: 이게 전부다
import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}));

// 컴포넌트에서 사용
function Counter() {
  const { count, increment, decrement } = useCounterStore();
  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

Provider가 필요 없다. Action Type이 없다. Reducer가 없다. 스토어 설정이 없다. `create` 함수 하나로 스토어를 만들고, 훅처럼 사용하면 끝이다.

Zustand의 또 다른 장점은 선택적 구독이었다.

```javascript
// 필요한 값만 선택해서 구독
// count가 바뀔 때만 이 컴포넌트가 리렌더링된다
const count = useCounterStore((state) => state.count);

// user가 바뀔 때만 이 컴포넌트가 리렌더링된다
const user = useUserStore((state) => state.user);
```

Context API의 성능 문제를 해결하면서도 API는 훨씬 단순했다.

## Jotai — 원자적 상태 관리 (2020)

Jotai는 Facebook의 Recoil에서 영감을 받아 만들어졌다. **Atom**이라는 최소 단위의 상태 조각을 정의하고, 필요한 컴포넌트에서 그것을 사용하는 방식이다.

```javascript
import { atom, useAtom } from 'jotai';

// 원자 정의
const countAtom = atom(0);
const userAtom = atom(null);
const themeAtom = atom('light');

// 파생 원자 (다른 원자를 기반으로 계산)
const doubledCountAtom = atom((get) => get(countAtom) * 2);
const isLoggedInAtom = atom((get) => get(userAtom) !== null);

// 컴포넌트에서 사용
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubled] = useAtom(doubledCountAtom);
  
  return (
    <div>
      <span>{count}</span>
      <span>{doubled}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
```

각 원자는 독립적이다. `count`가 바뀌면 `count`를 구독하는 컴포넌트만 리렌더링된다. `doubledCountAtom`은 `countAtom`이 바뀔 때만 재계산된다.

이 접근법의 장점은 **Bottom-up 방식**이었다. 전체 앱의 상태 구조를 미리 설계하지 않아도 된다. 필요한 상태를 필요할 때 정의한다.

## Valtio — 프록시 기반의 접근 (2020)

같은 팀에서 만든 Valtio는 완전히 다른 방식을 취했다. JavaScript의 Proxy를 이용해서 일반 객체를 반응형으로 만들었다.

```javascript
import { proxy, useSnapshot } from 'valtio';

const state = proxy({
  count: 0,
  user: null,
  
  increment() {
    this.count++;
  },
  
  setUser(user) {
    this.user = user;
  }
});

function Counter() {
  const snap = useSnapshot(state);
  
  return (
    <div>
      <span>{snap.count}</span>
      <button onClick={state.increment}>+</button>
    </div>
  );
}
```

`state.count++`처럼 직접 변경하는 코드를 쓸 수 있다. Proxy가 변경을 감지해서 관련 컴포넌트를 업데이트한다. MobX의 아이디어를 훨씬 가볍게 구현한 것이다.

<br/>

# 파트 9: 서버 상태의 분리 — 가장 중요한 패러다임 전환

## 클라이언트 상태 vs 서버 상태

이 시점에서 상태 관리의 역사에서 가장 중요한 개념 전환을 짚어야 한다.

많은 어플리케이션에서 Redux 스토어의 대부분은 사실 **서버에서 가져온 데이터**였다.

```javascript
// Redux 스토어에 담긴 것들의 실체
const state = {
  posts: [],           // 서버 데이터
  users: {},           // 서버 데이터
  comments: [],        // 서버 데이터
  currentUser: null,   // 서버 데이터 (또는 인증 상태)
  
  // 이것만이 진짜 클라이언트 상태
  selectedTab: 'home',
  sidebarOpen: false,
  searchQuery: ''
};
```

서버 데이터를 Redux에 넣으면 자동으로 해결해줘야 하는 것들이 생긴다.

- 언제 다시 가져올 것인가? (캐시 무효화)
- 다른 탭에서 데이터가 바뀌면 어떻게 할 것인가?
- 여러 컴포넌트가 같은 데이터를 요청하면 중복 요청을 막을 것인가?
- 로딩/에러 상태를 어떻게 관리할 것인가?
- 낙관적 업데이트는 어떻게 할 것인가?

이것들을 Redux로 구현하려면 엄청난 코드가 필요했다. 그리고 개발자들은 이 모든 것을 직접 구현하느라 지쳐갔다.

## React Query의 혁명 (2019)

2019년 Tanner Linsley가 React Query(현재 TanStack Query)를 공개했다. 이것은 상태 관리의 역사에서 가장 중요한 패러다임 전환 중 하나였다.

React Query의 핵심 주장은 단순했다.

**서버 상태는 클라이언트 상태와 다르다. 다르게 다뤄야 한다.**

```javascript
// React Query로 서버 데이터 관리
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function PostList() {
  // 자동 캐싱, 로딩 상태, 에러 상태, 백그라운드 갱신이 모두 포함
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('/api/posts').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유효
    refetchOnWindowFocus: true // 탭 전환 시 자동 갱신
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <ul>{posts.map(post => <PostItem key={post.id} post={post} />)}</ul>;
}

function CreatePost() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newPost) => fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(newPost)
    }),
    onSuccess: () => {
      // 성공하면 posts 캐시를 무효화하여 자동으로 다시 가져옴
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
  
  return (
    <button onClick={() => mutation.mutate({ title: 'New Post' })}>
      Create Post
    </button>
  );
}
```

React Query가 처리해주는 것들:
- 자동 캐싱 및 캐시 무효화
- 중복 요청 제거(동시에 여러 컴포넌트가 같은 데이터를 요청해도 한 번만 fetch)
- 백그라운드에서 자동 갱신
- 포커스 시 자동 갱신
- 로딩/에러/성공 상태 자동 관리
- 낙관적 업데이트
- 무한 스크롤 페이지네이션
- 재시도 로직

이 모든 것을 수십 줄의 코드로 해결했다. 이전에 수백 줄의 Redux 코드가 필요했던 것을.

## SWR — Stale-While-Revalidate (2019)

같은 해 Vercel이 SWR을 공개했다. HTTP 캐시 전략인 stale-while-revalidate에서 이름을 따왔다.

```javascript
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(r => r.json());

function UserProfile({ userId }) {
  const { data: user, error, isLoading } = useSWR(
    `/api/users/${userId}`,
    fetcher
  );
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;
  
  return <div>{user.name}</div>;
}
```

SWR과 React Query의 등장은 생태계 전체에 메시지를 던졌다. **서버 상태를 Redux에 넣지 마라.** 전용 라이브러리가 훨씬 잘 처리한다.

이 이후로 많은 팀이 Redux의 80~90%를 React Query로 교체하고, 진짜 클라이언트 상태만 Redux(또는 Zustand)에 두는 패턴을 채택했다.

## Apollo Client와 GraphQL 상태 관리

GraphQL 생태계에서는 Apollo Client가 비슷한 역할을 했다.

```javascript
// Apollo Client: GraphQL 쿼리와 캐싱
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      author {
        name
      }
    }
  }
`;

function PostList() {
  const { loading, error, data } = useQuery(GET_POSTS);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error!</p>;
  
  return data.posts.map(post => <PostCard key={post.id} post={post} />);
}
```

Apollo는 GraphQL 응답을 정규화하여 캐시에 저장했다. 같은 `Post` 타입이 다른 쿼리에서 반환되면, 캐시에서 같은 엔티티를 공유했다. 이것은 서버 상태 관리의 또 다른 접근법이었다.

---

# 파트 10: 현재의 트렌드와 미래

## 2022~2024의 상태 관리 지형

오늘날 상태 관리 생태계는 크게 세 계층으로 안정됐다.

**1계층: 서버 상태 — TanStack Query / SWR**

서버에서 가져오는 데이터는 TanStack Query나 SWR이 담당한다. 캐싱, 갱신, 로딩/에러 상태가 자동으로 처리된다.

**2계층: 전역 클라이언트 상태 — Zustand / Jotai**

진짜 클라이언트 상태(사이드바 열림 여부, 테마, 인증 상태 등)는 Zustand나 Jotai 같은 가벼운 라이브러리가 담당한다.

**3계층: 지역 상태 — useState / useReducer**

컴포넌트 안에서만 의미 있는 상태는 React 내장 훅으로 처리한다.

이 세 계층을 명확히 분리하는 것이 현재의 베스트 프랙티스다.

## React의 최신 방향 — Server Components

2023년 React 18과 함께 Server Components가 안정화됐다. Next.js App Router가 이를 적극 채택했다.

Server Components는 상태 관리의 관점에서 근본적인 변화를 가져온다. 컴포넌트가 서버에서 렌더링되면, 데이터를 가져오는 것 자체가 클라이언트 상태 문제가 아니게 된다.

```tsx
// Server Component — 데이터 패칭이 상태 관리 문제가 아니다
async function PostList() {
  // 서버에서 직접 fetch, 클라이언트 상태 불필요
  const posts = await fetch('/api/posts').then(r => r.json());
  
  return (
    <ul>
      {posts.map(post => (
        <PostItem key={post.id} post={post} />
      ))}
    </ul>
  );
}
```

Server Component 안에서 async/await로 데이터를 가져오면, 그 데이터는 클라이언트로 HTML 형태로 전달된다. `useQuery`도 `useEffect`도 필요 없다. 상태 자체가 없다.

이것은 매우 중요한 함의를 가진다. 많은 페이지에서 클라이언트 상태 관리 자체가 불필요해졌다. 서버가 최신 데이터를 렌더링해서 내려주고, 인터랙션이 필요한 부분에만 Client Component를 사용하는 방식이다.

## React 19와 새로운 훅들

React 19는 상태 관리와 관련된 새로운 훅들을 도입했다.

**`use` 훅**
Promise나 Context를 조건부로 읽을 수 있게 해주는 훅이다.

```jsx
// React 19의 use 훅
import { use } from 'react';

function PostDetail({ postPromise }) {
  // Promise를 직접 unwrap
  const post = use(postPromise);
  return <article>{post.title}</article>;
}
```

**`useOptimistic` 훅**
낙관적 업데이트를 위한 전용 훅이다.

```jsx
function LikeButton({ post }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    post.likes,
    (currentLikes, amount) => currentLikes + amount
  );
  
  async function handleLike() {
    addOptimisticLike(1); // 즉시 UI 업데이트
    await likePost(post.id); // 서버 요청
  }
  
  return (
    <button onClick={handleLike}>
      {optimisticLikes} Likes
    </button>
  );
}
```

**`useFormStatus`와 `useActionState`**
서버 액션과 폼 상태를 처리하기 위한 훅들이다.

```jsx
// 폼 상태와 서버 액션의 통합
function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      const result = await submitContactForm(formData);
      return result;
    },
    null
  );
  
  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

이 훅들은 서버와 클라이언트 사이의 상태 경계를 더욱 흐리게 만든다. 폼 제출 상태, 낙관적 업데이트, 서버 액션 결과가 단일 훅으로 통합되는 방향이다.

## Signals — 새로운 반응형 패러다임

2022년 Preact 팀이 Signals를 도입했다. Angular, Vue, Solid 등 여러 프레임워크가 유사한 개념을 채택하고 있다.

```javascript
// Preact Signals
import { signal, computed, effect } from '@preact/signals';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Doubled: ${doubled.value}`);
});

count.value = 5; // Count: 5, Doubled: 10
```

Signals의 핵심은 **세밀한 반응성(Fine-grained Reactivity)**이다. 전체 컴포넌트를 리렌더링하는 대신, 실제로 바뀐 값에 의존하는 DOM 노드만 업데이트된다.

React의 Virtual DOM 방식과 근본적으로 다르다. React는 상태가 변경되면 컴포넌트 함수를 다시 실행하고, 이전 Virtual DOM과 비교해서 변경된 부분을 찾는다. Signals는 어떤 값이 어떤 DOM에 연결되어 있는지 추적하기 때문에, 중간 과정 없이 해당 DOM만 업데이트한다.

**SolidJS**는 이 아이디어를 철저하게 추구하는 프레임워크다.

```javascript
// SolidJS — React처럼 생겼지만 내부가 완전히 다르다
import { createSignal, createMemo } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);
  
  return (
    <div>
      <span>{count()}</span>
      <span>{doubled()}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
```

겉보기엔 React와 비슷하지만, SolidJS에서 컴포넌트 함수는 단 한 번만 실행된다. 이후에는 Signal 값이 바뀔 때마다 해당하는 부분만 업데이트된다. Virtual DOM이 없다.

TC39(JavaScript 표준화 위원회)에서는 Signals를 JavaScript 언어 레벨에 추가하는 제안이 진행 중이다. 만약 이것이 표준이 된다면, 모든 프레임워크가 공통적인 반응형 기반을 가지게 되는 셈이다.

## Zustand vs Jotai vs Redux — 2024년 현재의 선택

NPM 다운로드 트렌드를 보면 현재 상황을 파악할 수 있다.

**Redux Toolkit**: 여전히 압도적인 1위. 엔터프라이즈 프로젝트, 대규모 팀, 레거시 시스템에서 표준으로 자리잡혀 있다. 새 프로젝트에서도 복잡한 상태 로직이 필요하거나 Redux DevTools의 강력한 디버깅이 필요한 경우 선택된다.

**Zustand**: 가장 빠르게 성장하는 라이브러리. 단순함, 낮은 러닝 커브, 훌륭한 성능으로 중소 규모 프로젝트에서 Redux의 대안으로 자리잡고 있다.

**Jotai**: 원자적 상태 관리가 필요한 경우, 특히 컴포넌트 간의 상태 공유가 세밀하게 필요한 경우 선택된다.

**TanStack Query**: 서버 상태 관리의 사실상 표준. 거의 모든 새 프로젝트에서 고려 대상이다.

실제로 2024년 기준 많은 React 프로젝트의 상태 관리 스택은 이렇다.

```
서버 상태: TanStack Query
전역 클라이언트 상태: Zustand
지역 상태: useState / useReducer
폼 상태: React Hook Form
URL 상태: nuqs / next/navigation
```

---

# 파트 11: 상태 관리의 본질적 교훈

## 역사에서 배우는 것들

상태 관리의 역사를 돌아보면 반복되는 패턴이 보인다.

**1. 단순함은 영원히 가치 있다**

Backbone의 이벤트 기반 시스템도, Redux의 순수 함수 Reducer도, Zustand의 단순한 API도, 각 시대의 승자는 항상 핵심을 명확하게 표현한 쪽이었다. 복잡한 것은 결국 교체된다.

**2. 문제를 올바르게 분류하는 것이 먼저다**

서버 상태를 클라이언트 상태처럼 관리하려 했던 것이 Redux 과부하의 근본 원인이었다. 문제의 본질을 파악하고 그에 맞는 도구를 선택하는 것이 핵심이다.

**3. 예측 가능성은 복잡성보다 중요하다**

Redux가 MobX보다 보일러플레이트가 많음에도 더 오래 지배할 수 있었던 이유는 예측 가능성이었다. 무슨 일이 일어나는지 항상 알 수 있다는 것은 팀 개발에서 매우 중요하다.

**4. 도구는 맥락에 따라 다르다**

"최고의 상태 관리 라이브러리"는 없다. 프로젝트의 규모, 팀의 숙련도, 데이터의 특성, 성능 요구사항에 따라 적절한 도구가 다르다.

**5. 상태를 줄이는 것이 관리보다 낫다**

상태를 잘 관리하는 것보다 상태 자체를 줄이는 것이 더 좋다. URL 상태, 파생 상태, 서버 렌더링으로 클라이언트 상태를 제거할 수 있다면 그것이 최선이다.

## 상태 배치의 황금률

오늘날 상태를 배치하는 기준은 이렇다.

```
1. 이 상태가 정말 필요한가?
   → URL에서 파생되지 않는가?
   → 서버에서 직접 렌더링할 수 없는가?
   → 다른 상태에서 계산되지 않는가?

2. 얼마나 많은 컴포넌트에서 필요한가?
   → 하나의 컴포넌트: useState
   → 인접한 몇 개: Props
   → 트리 전체: Context 또는 전역 스토어

3. 어디서 오는 데이터인가?
   → 서버에서 가져온다: TanStack Query / SWR
   → 클라이언트에서 생성된다: useState / Zustand

4. 얼마나 복잡한가?
   → 단순한 값: useState
   → 여러 액션이 있는 복잡한 로직: useReducer / Zustand
   → 대규모 팀의 복잡한 앱: Redux Toolkit
```

## 앞으로의 방향

상태 관리는 계속 진화한다. 지금 이 순간에도 여러 방향의 실험이 이루어지고 있다.

**서버와 클라이언트 경계의 소멸**
React Server Components, Server Actions, Remix의 loader/action 패턴이 보여주는 방향은 서버와 클라이언트 사이의 상태 동기화 문제를 언어/프레임워크 레벨에서 해결하는 것이다.

**Signals의 부상**
세밀한 반응성은 Virtual DOM의 비용 없이 더 효율적인 업데이트를 가능하게 한다. JavaScript 표준 제안이 통과된다면 모든 프레임워크에 영향을 줄 것이다.

**AI와 상태**
AI 어시스턴트를 포함한 어플리케이션에서 스트리밍 응답, 부분 업데이트, 복잡한 비동기 상태를 어떻게 관리할 것인가가 새로운 과제로 등장하고 있다.

---
