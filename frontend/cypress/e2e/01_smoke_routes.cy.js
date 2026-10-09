describe('Giai đoạn 4.1: Smoke Test - Kiểm tra Render tất cả các Route chính', () => {
  beforeEach(() => {
    cy.assertNoConsoleErrors();
  });

  context('1. Phân hệ HR Portal', () => {
    beforeEach(() => {
      cy.loginAs('hr');
    });

    it('HR Dashboard & Thống kê tổng hợp render thành công', () => {
      cy.visit('/hr/dashboard');
      cy.get('.enterprise-app-shell').should('be.visible');
      cy.contains('Tổng quan & Thống kê tuyển dụng').should('be.visible');
      cy.get('.kpi-stat-card').should('have.length.at.least', 4);
    });

    it('HR Báo cáo chuyên cần & Điểm danh render thành công', () => {
      cy.visit('/hr/attendance');
      cy.get('.att-report-panel').should('be.visible');
      cy.contains('Báo cáo chuyên cần').should('be.visible');
      cy.get('table').should('be.visible');
    });

    it('HR Quản lý Phân công Mentor (Workload) render thành công', () => {
      cy.visit('/hr/mentor-assignment');
      cy.contains('Theo dõi tải công việc Mentor').should('be.visible');
      cy.contains('Phân công Mentor cho Thực tập sinh').should('be.visible');
    });

    it('HR Quản lý Hợp đồng & Tiếp nhận render thành công', () => {
      cy.visit('/hr/contracts');
      cy.contains('Quản lý Hợp đồng & Tiếp nhận').should('be.visible');
    });

    it('HR Quản lý Yêu cầu hỗ trợ (Support Tickets) render thành công', () => {
      cy.visit('/hr/tickets');
      cy.contains('Trung tâm tiếp nhận & Xử lý yêu cầu').should('be.visible');
    });
  });

  context('2. Phân hệ Mentor Portal', () => {
    beforeEach(() => {
      cy.loginAs('mentor');
    });

    it('Mentor Dashboard với đầy đủ các Tab nghiệp vụ render thành công', () => {
      cy.visit('/mentor/dashboard');
      cy.get('.mentor-portal-container').should('be.visible');
      cy.contains('Thực tập sinh').should('be.visible');
      cy.contains('Nhiệm vụ Sprint').should('be.visible');
      cy.contains('Báo cáo tuần').should('be.visible');
      cy.contains('Đánh giá cuối kỳ').should('be.visible');
    });
  });

  context('3. Phân hệ Intern Portal (Thực tập sinh)', () => {
    beforeEach(() => {
      cy.loginAs('intern');
    });

    it('Intern Dashboard & Đồng hồ chấm công render thành công', () => {
      cy.visit('/intern/dashboard');
      cy.get('.intern-dashboard-container').should('be.visible');
      cy.contains('Check-in vào ca').should('exist');
    });

    it('Intern Lịch làm việc & Timeline render thành công', () => {
      cy.visit('/intern/schedule');
      cy.get('.schedule-container').should('be.visible');
      cy.contains('Lịch thực tập cá nhân').should('be.visible');
    });

    it('Intern Chấm công & Nghỉ phép render thành công', () => {
      cy.visit('/intern/attendance');
      cy.get('.att-page-container').should('be.visible');
      cy.contains('Lịch sử chấm công').should('be.visible');
    });

    it('Intern Ký kết hợp đồng điện tử render thành công', () => {
      cy.visit('/intern/contract-signing');
      cy.get('.contract-signing-card').should('be.visible');
      cy.contains('HỢP ĐỒNG THỎA THUẬN THỰC TẬP TỐT NGHIỆP').should('be.visible');
    });
  });
});

