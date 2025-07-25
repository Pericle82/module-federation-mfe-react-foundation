import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GlobalState {
  data: any;
  statuses: {
    mfe_1: string;
    mfe_2: string;
    store_mfe: string;
    service_mfe: string;
  };
}

const initialState: GlobalState = {
  data: null,
  statuses: {
    mfe_1: 'pending',
    mfe_2: 'pending',
    store_mfe: 'pending',
    service_mfe: 'pending',
  },
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setData(state, action: PayloadAction<any>) {
      state.data = action.payload;
    },
    setStatus(state, action: PayloadAction<{ mfe: keyof GlobalState['statuses']; status: string }>) {
      state.statuses[action.payload.mfe] = action.payload.status;
    },
  },
});

export const { setData, setStatus } = globalSlice.actions;

export const store = configureStore({
  reducer: {
    global: globalSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
