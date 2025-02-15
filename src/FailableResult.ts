export type FailableResult<E> = FailableResultWithValue<undefined, E>;

export type FailableResultWithValue<V, E> = SuccessResult<V> | ErrorResult<E>;

export interface SuccessResult<S> {
  readonly type: 'success';
  readonly value: S;
}

export interface ErrorResult<E> {
  readonly type: 'error';
  readonly error: E;
}

export const successResult = (): FailableResultWithValue<undefined, never> => {
  return { type: 'success', value: undefined };
};

export const successResultOf = <S>(
  value: S
): FailableResultWithValue<S, never> => {
  return { type: 'success', value: value };
};

export const errorResultOf = <E>(
  error: E
): FailableResultWithValue<never, E> => {
  return { type: 'error', error: error };
};

export const isSuccess = <S>(
  result: FailableResultWithValue<S, unknown>
): result is SuccessResult<S> => result.type === 'success';

export const isError = <E>(
  result: FailableResultWithValue<unknown, E>
): result is ErrorResult<E> => result.type === 'error';

export interface ErrorInformation {
  code: string;
  message: string;
}
