import type { QuizDocument } from "./schema";
export const exampleQuiz: QuizDocument = {
  format: "elzatona.quiz",
  version: 1,
  title: "مثال على صيغة الزتونة",
  description: "مثال توضيحي للصيغة، مش بنك أسئلة لمادة حقيقية.",
  language: "mixed",
  aiAssisted: false,
  questions: [
    {
      id: "q1",
      type: "mcq",
      prompt: "أي بنية بيانات بتشتغل بنظام FIFO؟",
      options: [
        { id: "a", text: "Stack" },
        { id: "b", text: "Queue" },
        { id: "c", text: "Tree" },
      ],
      correctOptionIds: ["b"],
      points: 1,
      explanation: "Queue بتخرج أول عنصر اتضاف الأول.",
      source: "",
    },
    {
      id: "q2",
      type: "true_false",
      prompt: "البحث الثنائي بيحتاج بيانات مرتّبة.",
      answer: true,
      points: 1,
      explanation: "الترتيب بيسمح باستبعاد نصف العناصر في كل خطوة.",
      source: "",
    },
    {
      id: "q3",
      type: "written",
      prompt: "اشرح باختصار الفرق بين Stack وQueue.",
      grading: "self",
      modelAnswer:
        "Stack: آخر عنصر يدخل هو أول عنصر يخرج (LIFO). Queue: أول عنصر يدخل هو أول عنصر يخرج (FIFO).",
      acceptedAnswers: [],
      points: 1,
      explanation: "قارن ترتيب دخول وخروج العناصر في إجابتك.",
      source: "",
    },
  ],
};
export const conversionPrompt = `حوّل بنك الأسئلة الذي سأرفقه إلى صيغة Elzatona Quiz v1. أخرج JSON فقط، من غير شرح أو Markdown.
القواعد:
- حافظ على اللغة والنص والترقيم والمعادلات كما وردت. استخدم plain text، ولا تضف HTML أو صور أو روابط ملفات خاصة.
- لا تخترع أسئلة أو إجابات أو تفسيرات. لو مفتاح الإجابة ناقص: MCQ correctOptionIds=null، صح/غلط answer=null، كتابي modelAnswer="". سأراجع الناقص يدويًا قبل النشر.
- format="elzatona.quiz"، version=1، language="ar" أو "en" أو "mixed"، aiAssisted=true.
- title من ٤ إلى ١٦٠ حرفًا، description لحد ٢٠٠٠ حرف، questions من ١ إلى ١٠٠ سؤال. لو البنك أطول قسّمه إلى ملفات مستقلة. كل ملف أقل من ٢٥٦ كيلوبايت.
- لكل سؤال id فريد مثل q1، prompt لحد ٣٠٠٠ حرف، explanation لحد ٢٠٠٠ حرف (فارغ لو مفيش تفسير أصلي)، points عدد صحيح ١ إلى ١٠ (الافتراضي ١)، source نص مرجع قصير أو فارغ.
- MCQ: type="mcq"، options من ٢ إلى ٨ اختيارات {id,text} بمعرّفات فريدة، correctOptionIds قائمة معرّفات الإجابات الصحيحة. تدعم إجابة واحدة أو أكثر. لا تعتمد على ترتيب الاختيارات.
- صح/غلط: type="true_false"، answer=true أو false أو null عند غياب المفتاح.
- كتابي: type="written"، grading="self" للإجابات الطويلة مع modelAnswer وacceptedAnswers=[]؛ أو grading="exact" لإجابة قصيرة محددة مع acceptedAnswers تضم كل البدائل المقبولة. لا تستخدم التصحيح النصّي المطابق للأسئلة المقالية.
- لا تضف حقولًا خارج المثال. راجع عدم تكرار المعرّفات ومطابقة correctOptionIds للاختيارات.
مثال مطابق (استبدل محتواه بأسئلة البنك):
${JSON.stringify({ ...exampleQuiz, aiAssisted: true }, null, 2)}
سأرفق الآن بنك أسئلة أملك حق استخدامه. لو نص سؤال غير مقروء، اطلب توضيحه ولا تخمّنه.`;
