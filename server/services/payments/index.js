const { square } = require('../../config/appConfig');
const mockProvider = require('./mock');
const squareProvider = require('./square');

const paymentMode = square.paymentProviderMode === 'square' ? 'square' : 'mock';
const activeProvider = paymentMode === 'square' ? squareProvider : mockProvider;

module.exports = {
  paymentMode,
  isMockMode: paymentMode === 'mock',
  isSquareMode: paymentMode === 'square',
  paymentEnabled: activeProvider.enabled,
  paymentProviderLabel: activeProvider.providerLabel,
  createPayment: activeProvider.createPayment
};
