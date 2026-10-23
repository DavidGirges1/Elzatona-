import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  Search,
  FolderOpen,
  Share2,
  MessageCircle,
  FileText,
  Link2,
  HeartHandshake,
  Bookmark,
  ThumbsUp,
  Check,
} from "lucide-react";
import { ProductPreview } from "@/components/landing/preview";
import { Reveals } from "@/components/landing/reveal";
export const metadata = {
  title: "كل ماتريالزك في مكان واحد.",
  description:
    "مصادر موادك من غير دوشة. اختار جامعتك وكليتك وسنتك، ووصل للملخصات والشرح وشارك اللي فادك مع دفعتك.",
};
export default function Landing() {
  return (
    <div className="landing">
      <Reveals />
      <header className="landing-nav landing-container">
        <Link
          href="/"
          className="wordmark"
          aria-label="الزتونة، الصفحة الرئيسية"
        >
          الزتونة.
        </Link>
        <nav aria-label="التنقل الرئيسي">
          <a className="landing-how" href="#how">
            بتشتغل إزاي؟
          </a>
          <Link className="text-link" href="/login">
            تسجيل الدخول <ArrowLeft size={17} />
          </Link>
        </nav>
      </header>
      <main id="content">
        <section className="landing-hero landing-container">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" />
              من الطلبة، للطلبة.
            </p>
            <h1>
              كل ماتريالزك
              <br />
              <span>في مكان واحد.</span>
            </h1>
            <p className="hero-description">
              بدل ما تدوّر بين الجروبات واللينكات، خلّي مصادر موادك قريبة منك.
              ملخصات، شرح، وامتحانات… مترتبة على جامعتك وكليتك وسنتك.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="button primary">
                ابدأ مع الزتونة <ArrowLeft size={19} />
              </Link>
              <a href="#how" className="text-link">
                شوف بتشتغل إزاي <ArrowDown size={17} />
              </a>
            </div>
            <p className="hero-note">
              <Check size={16} />
              تصفح المصادر المشتركة من غير حساب
            </p>
          </div>
          <div className="hero-product">
            <span className="sticker">من غير دوشة.</span>
            <ProductPreview />
          </div>
        </section>
        <section className="problem-section landing-container" data-reveal>
          <div className="section-kicker">أكيد عارف المشوار ده</div>
          <div className="problem-grid">
            <h2>
              «حد معاه لينك
              <br />
              المحاضرة؟»
            </h2>
            <div>
              <p className="landing-body">
                رسالة وسط ميت رسالة. لينك اتبعت من أسبوع. وفولدر محدش عارف آخر
                نسخة فيه فين.
              </p>
              <p className="muted">
                وقت المذاكرة أغلى من إنك تضيّعه في التدوير.
              </p>
              <div className="scattered-sources" aria-label="المصادر المتفرقة">
                <span>
                  <MessageCircle size={18} />
                  جروبات الدفعة
                </span>
                <span>
                  <Link2 size={18} />
                  لينكات كتير
                </span>
                <span>
                  <FileText size={18} />
                  ملفات متفرقة
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="solution-section landing-container" data-reveal>
          <div className="solution-panel">
            <div>
              <p className="eyebrow">الزتونة بتلمّ المفيد</p>
              <h2>كل مصدر، في مكانه.</h2>
              <p>
                من الجامعة للمادة، للمحاضرة اللي محتاجها. ترتيب بسيط يخليك توصّل
                للمفيد وترجعله وقت ما تحب.
              </p>
              <Link className="text-link" href="/courses">
                بص على المواد المتاحة <ArrowLeft size={17} />
              </Link>
            </div>
            <ol className="academic-path">
              <li>
                <span>١</span>
                <strong>جامعتك</strong>
                <small>البداية من مكانك</small>
              </li>
              <li>
                <span>٢</span>
                <strong>كليتك</strong>
                <small>على حسب دراستك</small>
              </li>
              <li>
                <span>٣</span>
                <strong>سنتك</strong>
                <small>المناسب لمرحلتك</small>
              </li>
              <li>
                <span>٤</span>
                <strong>موادك</strong>
                <small>كل مصدر في مادته</small>
              </li>
            </ol>
          </div>
        </section>
        <section id="how" className="how-section landing-container" data-reveal>
          <div className="section-kicker">ببساطة كده</div>
          <h2>٣ خطوات. ومذاكرتك أرتب.</h2>
          <div className="how-grid">
            {[
              {
                n: "٠١",
                Icon: FolderOpen,
                tone: "sky",
                title: "اختار جامعتك وكليتك",
                body: "عرّفنا إنت فين وفي سنة كام، عشان موادك تكون مناسبة ليك.",
              },
              {
                n: "٠٢",
                Icon: Search,
                tone: "lavender",
                title: "وصّل لماتريالز موادك",
                body: "دوّر حسب المادة، المحاضرة، أو نوع المصدر. افتح المفيد واحفظه لوقت ما تحتاجه.",
              },
              {
                n: "٠٣",
                Icon: Share2,
                tone: "sunshine",
                title: "شارك اللي فادك مع زمايلك",
                body: "معاك ملخص أو لينك شرح كويس؟ ضيفه في مادته ووفّر على غيرك وقت التدوير.",
              },
            ].map((v) => (
              <article className="how-step" key={v.n}>
                <div className={`resource-icon ${v.tone}`}>
                  <v.Icon size={24} />
                </div>
                <span className="step-number">{v.n}</span>
                <h3>{v.title}</h3>
                <p className="muted">{v.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="community-section landing-container" data-reveal>
          <div className="community-mark" aria-hidden="true">
            <HeartHandshake size={56} strokeWidth={1.5} />
            <span className="community-small lavender">
              <Bookmark size={23} />
            </span>
            <span className="community-small sunshine">
              <ThumbsUp size={23} />
            </span>
          </div>
          <div>
            <p className="eyebrow">دفعتك، بتساعد دفعتك</p>
            <h2>
              اللي فادك،
              <br />
              ممكن يفرّق مع غيرك.
            </h2>
            <p className="landing-body">
              مصدر واحد تشاركه ممكن يوفّر على زميلك ساعات. قيّم اللي ساعدك، اسأل
              عن اللي واقف معاك، وخلّي المفيد يوصل.
            </p>
            <p className="muted">
              مشاركة بإذن أصحاب المحتوى. من غير سبام أو دوشة فيد.
            </p>
          </div>
        </section>
        <section className="landing-container final-section" data-reveal>
          <div className="final-cta">
            <p className="eyebrow">يلا نلمّ المفيد</p>
            <h2>أول خطوة لمذاكرة أهدى.</h2>
            <p>موادك قريبة. ودفعتك معاك.</p>
            <Link href="/signup" className="button primary">
              ابدأ مع الزتونة <ArrowLeft size={19} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <div>
          <Link href="/" className="wordmark">
            الزتونة.
          </Link>
          <p>مصادر موادك، من غير دوشة.</p>
        </div>
        <nav aria-label="روابط مساعدة">
          <Link href="/courses">اكتشف المواد</Link>
          <Link href="/guidelines">المشاركة والخصوصية</Link>
          <Link href="/login">تسجيل الدخول</Link>
        </nav>
        <span>صُنعت للطلبة في مصر.</span>
      </footer>
    </div>
  );
}
