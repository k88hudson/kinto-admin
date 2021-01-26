import type { AppState, Plugin } from "../types";

import { createStore, applyMiddleware, compose } from "redux";
import createSagaMiddleware from "redux-saga";
import createRootReducer from "../reducers";
import rootSaga from "../sagas";
import { createHashHistory } from "history";

import { routerMiddleware } from "connected-react-router";

const sagaMiddleware = createSagaMiddleware();

export const hashHistory = createHashHistory();

export default function configureStore(
  initialState: Object = {},
  plugins: Plugin[] = []
) {
  // Each plugin exports a `reducers` attribute.
  const pluginReducers = plugins.map(({ reducers = {} }) => reducers);
  // Each plugin exports a `sagas` attribute.
  const pluginSagas = plugins.map(({ sagas = [] }) => sagas);

  const finalCreateStore = compose(
    applyMiddleware<AppState, any, any>(
      sagaMiddleware,
      routerMiddleware(hashHistory)
    ),
    // prettier-ignore
    (window as any).__REDUX_DEVTOOLS_EXTENSION__
      ? ((window as any).__REDUX_DEVTOOLS_EXTENSION__() as () => void)
      : (f) => f
  )(createStore);

  const store = finalCreateStore(
    createRootReducer(hashHistory, pluginReducers),
    initialState as any
  );
  // Every saga will receive the store getState() function as first argument
  // by default; this allows sagas to share the same signature and access the
  // state consistently.
  sagaMiddleware.run(rootSaga, store.getState.bind(store), pluginSagas);
  return store;
}