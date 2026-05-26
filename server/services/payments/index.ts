import { square } from '../../config/appConfig';
import * as squareProvider from './square';

const paymentMode = 'square';

export const isSquareMode = true;
export const paymentEnabled = squareProvider.enabled;
export const paymentProviderLabel = squareProvider.providerLabel;
export const createPayment = squareProvider.createPayment;
export { paymentMode };
