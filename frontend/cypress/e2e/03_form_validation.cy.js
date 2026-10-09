describe('Giai đoạn 4.3: Form Validation Test - Kiểm tra Ràng buộc nhập liệu & Cảnh báo', () => {
  context('1. Validate Form Tạo ca làm việc (Work Schedule Settings)', () => {
    beforeEach(() => {
      cy.loginAs('hr');
      cy.visit('/hr/attendance');
    });

    it('Báo lỗi đỏ khi giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu', () => {
      cy.get('.schedule-config-btn').click();
      cy.get('#ws-group').select(1);
      cy.get('#ws-start-time').clear().type('17:00');
      cy.get('#ws-end-time').clear().type('08:00');
      cy.get('.ws-day-checkbox').first().check();

      cy.get('.ws-submit-btn').click();
      cy.get('.form-error-msg')
        .should('be.visible')
        .and('contain.text', 'Giờ kết thúc phải lớn hơn giờ bắt đầu');
    });
  });

  context('2. Validate Form Nộp đơn xin nghỉ phép (Intern Leave Request)', () => {
    beforeEach(() => {
      cy.loginAs('intern');
      cy.visit('/intern/attendance');
    });

    it('Báo lỗi khi gửi form rỗng và khi ngày kết thúc nhỏ hơn ngày bắt đầu', () => {
      cy.contains('Tạo đơn xin nghỉ phép mới').click();
      cy.get('.modal-container').should('be.visible');

      // Submit form rỗng
      cy.get('button[type="submit"]').contains('Gửi đơn xin nghỉ phép').click();
      cy.contains('Vui lòng chọn đầy đủ ngày bắt đầu').should('be.visible');

      // Điền ngày kết thúc nhỏ hơn ngày bắt đầu
      cy.get('#leave-start-date').type('2026-10-20');
      cy.get('#leave-end-date').type('2026-10-15');
      cy.get('#leave-reason').type('Xin nghỉ thi học phần tại ICTU');
      cy.get('button[type="submit"]').contains('Gửi đơn xin nghỉ phép').click();

      cy.contains('Ngày kết thúc không được trước ngày bắt đầu').should('be.visible');
    });
  });

  context('3. Validate Đính kèm File Báo cáo tuần (Weekly Report Drag & Drop)', () => {
    beforeEach(() => {
      cy.loginAs('intern');
      cy.visit('/intern/reports');
    });

    it('Chặn và cảnh báo khi upload file vượt quá dung lượng 5MB', () => {
      cy.contains('Nộp báo cáo mới').click();

      // Giả lập file dung lượng 6MB
      const bigFile = {
        fileName: 'BaoCaoQuaDungLuong.docx',
        fileContent: 'a'.repeat(6 * 1024 * 1024),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(bigFile.fileContent),
        fileName: bigFile.fileName,
        mimeType: bigFile.mimeType,
      }, { force: true });

      cy.contains('Dung lượng file vượt quá mức cho phép (Tối đa 5MB)').should('be.visible');
      cy.get('.wrf-btn-submit').should('be.disabled');
    });

    it('Chặn định dạng file không hợp lệ', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test-binary'),
        fileName: 'TepKhongHopLe.exe',
        mimeType: 'application/x-msdownload',
      }, { force: true });

      cy.contains('Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)').should('be.visible');
    });
  });
});

