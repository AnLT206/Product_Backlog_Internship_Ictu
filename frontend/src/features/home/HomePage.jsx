import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import logoApp from '../../assets/logo_app.png'
import './HomePage.css'

const FEATURES = [
  {
    title: 'Chuẩn hóa tiếp nhận',
    desc: 'Quy trình nộp hồ sơ, xét duyệt và phản hồi thống nhất — giảm email và Excel rời rạc.',
    icon: 'inbox',
  },
  {
    title: 'Theo dõi tiến độ realtime',
    desc: 'TTS, HR và mentor cùng nhìn thấy trạng thái hồ sơ, chấm công, công việc và báo cáo.',
    icon: 'pulse',
  },
  {
    title: 'Báo cáo minh bạch với nhà trường',
    desc: 'Tổng hợp chuyên cần, đánh giá và kết quả kỳ thực tập sẵn sàng gửi ICTU / doanh nghiệp.',
    icon: 'report',
  },
]

const STEPS = [
  {
    title: 'Đăng ký',
    desc: 'Tạo tài khoản TTS và nộp hồ sơ trực tuyến.',
    link: 'Xem hướng dẫn',
    icon: 'edit',
  },
  {
    title: 'Xét duyệt',
    desc: 'HR duyệt hoặc từ chối với trạng thái rõ ràng.',
    link: 'Quy trình duyệt',
    icon: 'check',
  },
  {
    title: 'Phân công',
    desc: 'Gán mentor và chương trình thực tập phù hợp.',
    link: 'Về phân công',
    icon: 'users',
  },
  {
    title: 'Thực tập',
    desc: 'Chấm công, nhận việc, nộp báo cáo tuần.',
    link: 'Hoạt động TTS',
    icon: 'work',
  },
  {
    title: 'Đánh giá',
    desc: 'Đánh giá cuối kỳ và lưu kết quả minh bạch.',
    link: 'Tiêu chí đánh giá',
    icon: 'star',
    highlight: true,
  },
]

const ROLES = [
  {
    title: 'Thực tập sinh',
    footer: 'Dành cho sinh viên',
    icon: 'grad',
    points: [
      'Đăng ký và nộp hồ sơ trực tuyến',
      'Theo dõi trạng thái xét duyệt',
      'Chấm công, công việc và báo cáo tuần',
      'Xem lịch, quyền lợi và đánh giá',
    ],
  },
  {
    title: 'Doanh nghiệp & HR',
    footer: 'Dành cho doanh nghiệp',
    icon: 'building',
    points: [
      'Duyệt hồ sơ ứng viên tập trung',
      'Quản lý chương trình và phân công mentor',
      'Theo dõi chuyên cần và phụ cấp',
      'Xuất báo cáo gửi trường / lãnh đạo',
    ],
  },
  {
    title: 'Giảng viên & Mentor',
    footer: 'Dành cho mentor',
    icon: 'mentor',
    points: [
      'Nhận TTS được phân công',
      'Giao việc và phản hồi tiến độ',
      'Duyệt báo cáo tuần',
      'Đánh giá kỹ năng và thái độ',
    ],
  },
]

function Icon({ name }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (name) {
    case 'pulse':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h3l2-5 3 10 2-5h8" {...common} />
        </svg>
      )
    case 'report':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...common} />
          <path d="M14 4v4h4M9 13h6M9 17h4" {...common} />
        </svg>
      )
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4l10-10-4-4L4 16v4z" {...common} />
          <path d="M12 6l4 4" {...common} />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" {...common} />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="9" r="3" {...common} />
          <circle cx="16" cy="10" r="2.5" {...common} />
          <path d="M4 19c1.5-3 4-4.5 5-4.5S12.5 16 14 19" {...common} />
          <path d="M14 15.5c1 .2 2.5 1 3.5 3.5" {...common} />
        </svg>
      )
    case 'work':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="18" height="12" rx="2" {...common} />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...common} />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l2.4 5.4L20 9.3l-4 4.1.9 5.6L12 16.5 7.1 19l.9-5.6-4-4.1 5.6-.9L12 3z" {...common} />
        </svg>
      )
    case 'grad':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10l9-5 9 5-9 5-9-5z" {...common} />
          <path d="M7 12.5v4c2 1.5 8 1.5 10 0v-4" {...common} />
          <path d="M21 10v6" {...common} />
        </svg>
      )
    case 'building':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14" {...common} />
          <path d="M14 10h5a1 1 0 0 1 1 1v9" {...common} />
          <path d="M7 8h2M7 12h2M7 16h2M4 20h16" {...common} />
        </svg>
      )
    case 'mentor':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.2" {...common} />
          <path d="M5 19c1.8-3.2 4.2-4.5 7-4.5S17.2 15.8 19 19" {...common} />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
          <path d="M8 9h8M8 13h5" {...common} />
        </svg>
      )
  }
}

function HomePage() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.home [data-reveal]')
    if (!nodes.length) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      nodes.forEach((node) => node.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="home">
      <header className="home-nav">
        <div className="home-wrap home-nav__inner">
          <a className="home-brand" href="#top">
            <img
              className="home-brand__mark"
              src={logoApp}
              alt=""
              width={28}
              height={28}
            />
            <span className="home-brand__text">ICTU Internship</span>
          </a>

          <nav className="home-nav__links" aria-label="Điều hướng chính">
            <a href="#gioi-thieu">Giới thiệu</a>
            <a href="#quy-trinh">Quy trình</a>
            <a href="#doi-tuong">Đối tượng</a>
            <a href="#bat-dau">Bắt đầu</a>
            <a href="#lien-he">Liên hệ</a>
          </nav>

          <div className="home-nav__actions">
            <Link className="home-nav__login" to="/login">
              Đăng nhập
            </Link>
            <Link className="home-btn home-btn--primary" to="/register">
              Đăng ký thực tập
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO — 2 cột: copy trái + hệ sinh thái phải */}
        <section className="home-hero">
          <div className="home-hero__glow" aria-hidden="true" />

          <div className="home-wrap home-hero__grid">
            <div className="home-hero__copy home-reveal" data-reveal>
              <h1>
                Nền tảng toàn diện cho
                <span className="home-hero__accent"> quản lý thực tập</span>
              </h1>
              <p className="home-hero__lead">
                Kết nối thực tập sinh, doanh nghiệp và nhà trường — thúc đẩy minh bạch hồ sơ, tiến độ
                và đánh giá trên một hệ thống.
              </p>
              <div className="home-hero__cta">
                <Link className="home-btn home-btn--primary home-btn--lg" to="/register">
                  Đăng ký thực tập
                </Link>
              </div>
            </div>

            <div
              className="home-hero__visual home-reveal"
              data-reveal
              style={{ '--reveal-delay': '120ms' }}
              aria-hidden="true"
            >
              <div className="home-orbit">
                <span className="home-orbit__ring home-orbit__ring--a" />
                <span className="home-orbit__ring home-orbit__ring--b" />
                <span className="home-orbit__ring home-orbit__ring--c" />

                <span className="home-orbit__dot home-orbit__dot--1" />
                <span className="home-orbit__dot home-orbit__dot--2" />
                <span className="home-orbit__dot home-orbit__dot--3" />
                <span className="home-orbit__dot home-orbit__dot--4" />

                <div className="home-orbit__core">
                  <img
                    className="home-orbit__core-logo"
                    src={logoApp}
                    alt="ICTU Internship"
                    width={84}
                    height={84}
                  />
                </div>

                <div
                  className="home-orbit__sat home-orbit__sat--1"
                  style={{ '--orbit-start': '20deg' }}
                >
                  <div className="home-orbit__node">
                    <span className="home-orbit__icon home-orbit__icon--blue">
                      <Icon name="grad" />
                    </span>
                    <span className="home-orbit__label">Thực tập sinh</span>
                  </div>
                </div>
                <div
                  className="home-orbit__sat home-orbit__sat--2"
                  style={{ '--orbit-start': '110deg' }}
                >
                  <div className="home-orbit__node">
                    <span className="home-orbit__icon home-orbit__icon--orange">
                      <Icon name="building" />
                    </span>
                    <span className="home-orbit__label">Doanh nghiệp</span>
                  </div>
                </div>
                <div
                  className="home-orbit__sat home-orbit__sat--3"
                  style={{ '--orbit-start': '200deg' }}
                >
                  <div className="home-orbit__node">
                    <span className="home-orbit__icon home-orbit__icon--teal">
                      <Icon name="report" />
                    </span>
                    <span className="home-orbit__label">Nhà trường</span>
                  </div>
                </div>
                <div
                  className="home-orbit__sat home-orbit__sat--4"
                  style={{ '--orbit-start': '295deg' }}
                >
                  <div className="home-orbit__node">
                    <span className="home-orbit__icon home-orbit__icon--amber">
                      <Icon name="mentor" />
                    </span>
                    <span className="home-orbit__label">Mentor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES — left title + stacked rows like mock */}
        <section className="home-block home-block--soft" id="gioi-thieu">
          <div className="home-wrap home-features">
            <div className="home-features__intro home-reveal" data-reveal>
              <h2>Thay quy trình rời rạc bằng một hệ thống thống nhất</h2>
              <p>
                ICTU Internship chuẩn hóa tiếp nhận hồ sơ, theo dõi tiến độ thực tập và tạo báo cáo
                minh bạch — thay cho trao đổi email và bảng tính phân tán.
              </p>
            </div>

            <ul className="home-feature-rows">
              {FEATURES.map((item, index) => (
                <li
                  key={item.title}
                  className="home-feature-row home-reveal"
                  data-reveal
                  style={{ '--reveal-delay': `${90 + index * 80}ms` }}
                >
                  <span className="home-feature-row__icon">
                    <Icon name={item.icon} />
                  </span>
                  <div className="home-feature-row__body">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* STEPS — 5 equal cards */}
        <section className="home-block" id="quy-trinh">
          <div className="home-wrap">
            <div className="home-center home-reveal" data-reveal>
              <h2>Lộ trình thực tập 5 bước chuẩn mực</h2>
              <p>Mỗi bước có trạng thái rõ ràng — không mất thông tin giữa các bên.</p>
            </div>

            <ol className="home-steps">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className={`home-step home-reveal${step.highlight ? ' home-step--active' : ''}`}
                  data-reveal
                  style={{ '--reveal-delay': `${70 + index * 70}ms` }}
                >
                  <span className="home-step__icon">
                    <Icon name={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  <span className="home-step__link">{step.link}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ROLES — 3 cards with top icon */}
        <section className="home-block home-block--soft" id="doi-tuong">
          <div className="home-wrap">
            <div className="home-center home-reveal" data-reveal>
              <h2>Thiết kế chuyên biệt cho từng vai trò</h2>
              <p>Một nền tảng, trải nghiệm phù hợp với thực tập sinh, HR và mentor.</p>
            </div>

            <div className="home-roles">
              {ROLES.map((role, index) => (
                <article
                  key={role.title}
                  className="home-role home-reveal"
                  data-reveal
                  style={{ '--reveal-delay': `${80 + index * 90}ms` }}
                >
                  <span className="home-role__icon">
                    <Icon name={role.icon} />
                  </span>
                  <h3>{role.title}</h3>
                  <ul>
                    {role.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <p className="home-role__footer">{role.footer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="home-block home-cta" id="bat-dau">
          <div className="home-cta__inner home-reveal home-reveal--scale" data-reveal>
            <h2>Bắt đầu kỳ thực tập của bạn</h2>
            <p>Tạo tài khoản thực tập sinh để nộp hồ sơ và theo dõi tiến trình trên hệ thống.</p>
            <Link className="home-btn home-btn--primary home-btn--lg" to="/register">
              Đăng ký thực tập ngay
            </Link>
            <p className="home-cta__sub">
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="home-footer" id="lien-he">
        <div className="home-wrap home-footer__inner">
          <div>
            <p className="home-footer__brand">ICTU Internship Portal</p>
            <p className="home-footer__copy">Hệ thống quản lý thực tập sinh — ICTU</p>
          </div>
          <div className="home-footer__links">
            <a href="#gioi-thieu">Giới thiệu</a>
            <a href="#quy-trinh">Quy trình</a>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
