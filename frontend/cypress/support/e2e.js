import './commands';

// Ngăn Cypress fail khi gặp các exception ngoài ý muốn từ thư viện bên ngoài
Cypress.on('uncaught:exception', () => {
  return false;
});

