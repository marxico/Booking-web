import { square } from '../../config/appConfig';
import * as mockProvider from './mock';
import * as squareProvider from './square';

const paymentMode = square.paymentProviderMode === 'square' ? 'square' : 'mock';
const activeProvider = paymentMode === 'square' ? squareProvider : mockProvider;

export const isMockMode = paymentMode === 'mock';
export const isSquareMode = paymentMode === 'square';
export const paymentEnabled = activeProvider.enabled;
export const paymentProviderLabel = activeProvider.providerLabel;
export const mockCards = paymentMode === 'mock' ? mockProvider.mockCards || [] : [];
export const createPayment = activeProvider.createPayment;
export { paymentMode };
