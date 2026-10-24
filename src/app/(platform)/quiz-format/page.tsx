import { QuizFormatGuide } from "@/components/quiz/format-guide";
export const metadata = { title: "صيغة أسئلة الزتونة" };
export default function QuizFormatPage() {
  return (
    <div className="form-page">
      <span className="type-chip sky">
        <bdi>elzatona.quiz · v1</bdi>
      </span>
      <h1>حوّل بنك الأسئلة لمجموعة تفاعلية</h1>
      <p>
        انسخ التعليمات واستخدمها مع بنك الأسئلة في أداة تختارها. ارجع لمحرّر
        الأسئلة وارفع ملف JSON أو الصقه، وبعدها راجع الأسئلة والإجابات.
      </p>
      <ol className="quiz-guide-steps">
        <li>شارك محتوى عندك حق استخدامه، ومن غير بيانات شخصية.</li>
        <li>
          التحويل ممكن يغلط أو يسيب إجابات ناقصة. راجع كل سؤال بنفسك قبل النشر.
        </li>
        <li>
          المجموعة لحد ١٠٠ سؤال و٢٥٦ كيلوبايت. الصور والجداول المركّبة مش مدعومة
          في الصيغة الحالية.
        </li>
        <li>
          الكتابي الطويل له نموذج وتقييم ذاتي. الإجابة القصيرة ممكن تتصحّح
          بمطابقة النص.
        </li>
      </ol>
      <QuizFormatGuide />
    </div>
  );
}
