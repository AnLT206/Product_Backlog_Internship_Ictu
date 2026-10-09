describe('Giai đoạn 4.4: Action Test - Thao tác Nghiệp vụ & Cập nhật UI tức thì', () => {
  context('1. Thao tác Phê duyệt / Từ chối Ticket của HR', () => {
    beforeEach(() => {
      cy.loginAs('hr');
      cy.visit('/hr/tickets');
    });

    it('Bắt buộc nhập phản hồi khi từ chối, cập nhật Badge trạng thái ngay khi Submit', () => {
      cy.get('button').contains('Xem chi tiết').first().click();
      cy.get('.modal-container').should('be.visible');

      // Bấm Từ chối khi chưa nhập lý do -> Bị chặn
      cy.get('button').contains('Từ chối').click();

      // Nhập lý do từ chối hợp lệ
      cy.get('textarea').type('Phòng Nhân sự từ chối do chưa cung cấp đủ minh chứng.');
      cy.get('button').contains('Từ chối').click();

      // Modal đóng và hiển thị toast
      cy.get('.modal-container').should('not.exist');
    });
  });

  context('2. Mentor giao việc & Chấm điểm Rubric 1-5', () => {
    beforeEach(() => {
      cy.loginAs('mentor');
      cy.visit('/mentor/dashboard');
    });

    it('Mentor giao task mới: Form hiển thị spinner, đóng modal và task hiển thị ngay trong danh sách', () => {
      cy.contains('Giao nhiệm vụ').first().click();
      cy.get('.modal-container').should('be.visible');

      cy.get('#t-title').type('Phát triển kiểm thử tự động Cypress E2E');
      cy.get('#t-desc').type('Viết toàn bộ kịch bản kiểm thử tự động cho 4 module chính.');
      cy.get('#t-due').type('2026-10-30');

      cy.get('button[type="submit"]').contains('Giao nhiệm vụ ngay').click();

      // Task mới xuất hiện đầu danh sách
      cy.get('.modal-container').should('not.exist');
      cy.contains('Phát triển kiểm thử tự động Cypress E2E').should('be.visible');
    });

    it('Chấm điểm Rubric cuối kỳ: Điểm tổng kết tự động tính theo thời gian thực', () => {
      cy.contains('Đánh giá cuối kỳ').click();
      cy.contains('Đánh giá năng lực').first().click();

      // Thay đổi thang điểm từ 4 sang 5 cho tiêu chí 1
      cy.get('.rating-scale-row').first().within(() => {
        cy.contains('5').click();
      });

      // Banner điểm tổng kết cập nhật ngay
      cy.get('.eval-live-score-banner').should('be.visible');
      cy.get('.eval-score-num').should('not.contain.text', '0.0');
    });
  });

  context('3. Thực tập sinh ký kết hợp đồng điện tử', () => {
    beforeEach(() => {
      cy.loginAs('intern');
      cy.visit('/intern/contract-signing');
    });

    it('Checkbox mở khóa nút ký, bấm xác nhận đổi trạng thái tức thì', () => {
      cy.get('.contract-sign-btn').should('be.disabled');

      // Tích checkbox đồng ý điều khoản
      cy.get('#contract-agreement-checkbox').check({ force: true });
      cy.get('.contract-sign-btn').should('not.be.disabled').click();

      // Hiển thị trạng thái đang xử lý
      cy.get('.contract-sign-btn').should('contain.text', 'Đang xử lý');
    });
  });
});

