// Thiết lập user đăng nhập giả lập trong localStorage để vượt qua Auth Guard
Cypress.Commands.add('loginAs', (role = 'hr') => {
  const users = {
    hr: {
      id: 2,
      email: 'hr@ictu.edu.vn',
      full_name: 'Trần Thị Mai',
      role: 'hr',
      roles: ['hr'],
      token: 'mock-jwt-hr-token-xyz',
    },
    mentor: {
      id: 3,
      email: 'mentor@ictu.edu.vn',
      full_name: 'Nguyễn Văn Hùng',
      role: 'mentor',
      roles: ['mentor'],
      token: 'mock-jwt-mentor-token-xyz',
    },
    intern: {
      id: 5,
      code: 'TTS0001',
      email: 'intern@ictu.edu.vn',
      full_name: 'Nguyễn Văn An',
      role: 'intern',
      roles: ['intern'],
      token: 'mock-jwt-intern-token-xyz',
    },
  };

  const selectedUser = users[role] || users.hr;
  window.localStorage.setItem('access_token', selectedUser.token);
  window.localStorage.setItem('ictu_auth_user', JSON.stringify(selectedUser));
});

// Lệnh bắt lỗi console.error không mong muốn trên trình duyệt
Cypress.Commands.add('assertNoConsoleErrors', () => {
  cy.window().then((win) => {
    cy.spy(win.console, 'error').as('consoleError');
  });
});

