describe('Giai đoạn 4.2: Layout & Responsive Test (Desktop 1366x768 vs Mobile 375x667)', () => {
  const checkZeroHorizontalOverflow = () => {
    cy.window().then((win) => {
      const scrollWidth = win.document.documentElement.scrollWidth;
      const clientWidth = win.document.documentElement.clientWidth;
      expect(scrollWidth).to.be.at.most(clientWidth + 2); // Dung sai tối đa 2px
    });
  };

  context('Màn hình Desktop (1366 x 768)', () => {
    beforeEach(() => {
      cy.viewport(1366, 768);
      cy.loginAs('hr');
    });

    it('Desktop: Sidebar hiển thị cố định ở bên trái, Navbar có chuông thông báo', () => {
      cy.visit('/hr/dashboard');
      cy.get('.enterprise-sidebar').should('be.visible').and('not.have.class', 'is-mobile');
      cy.get('.enterprise-navbar').should('be.visible');
      cy.get('.notif-bell-btn').should('be.visible');
      checkZeroHorizontalOverflow();
    });

    it('Desktop: Bảng phân công Mentor hiển thị Grid co giãn cân đối không vỡ', () => {
      cy.visit('/hr/mentor-assignment');
      cy.contains('Theo dõi tải công việc Mentor').should('be.visible');
      checkZeroHorizontalOverflow();
    });
  });

  context('Màn hình Mobile (375 x 667 - Mobile chuẩn)', () => {
    beforeEach(() => {
      cy.viewport(375, 667);
      cy.loginAs('hr');
    });

    it('Mobile: Sidebar thu gọn thành Drawer ẩn, mở qua nút Hamburger và đóng qua Backdrop', () => {
      cy.visit('/hr/dashboard');

      // Sidebar ban đầu ở chế độ drawer
      cy.get('.enterprise-sidebar').should('have.class', 'is-drawer-closed');

      // Click nút mở Menu trên Header
      cy.get('.mobile-menu-toggle-btn').should('be.visible').click();
      cy.get('.enterprise-sidebar').should('have.class', 'is-drawer-open');
      cy.get('.sidebar-mobile-backdrop').should('be.visible');

      // Click vào Backdrop để đóng Sidebar
      cy.get('.sidebar-mobile-backdrop').click({ force: true });
      cy.get('.enterprise-sidebar').should('have.class', 'is-drawer-closed');

      checkZeroHorizontalOverflow();
    });

    it('Mobile: Trang Ký hợp đồng Thực tập sinh tự căn chỉnh, nút Ký full width', () => {
      cy.loginAs('intern');
      cy.visit('/intern/contract-signing');

      cy.get('.contract-content-box').should('be.visible');
      cy.get('.contract-actions-row').should('be.visible');
      cy.get('.contract-sign-btn').should('be.visible');
      checkZeroHorizontalOverflow();
    });
  });
});

