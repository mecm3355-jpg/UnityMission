import Link from "next/link";

type RoutePlaceholderProps = {
  title: string;
  description: string;
  backHref?: string;
};

export function RoutePlaceholder({
  title,
  description,
  backHref = "/dashboard",
}: RoutePlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-5 px-6 py-12">
      <p className="text-sm font-semibold tracking-widest text-[#F5C968]">UNITYMISSION</p>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="text-lg leading-8 text-slate-300">{description}</p>
      <p className="rounded-lg border border-[#5279CE] bg-[#152448] p-4 text-sm text-slate-200">
        현재 T01 라우트 골격입니다. 실제 학습 기능은 정해진 후속 작업에서 구현됩니다.
      </p>
      <Link className="w-fit underline decoration-[#F5C968] underline-offset-4" href={backHref}>
        이전 화면으로
      </Link>
    </main>
  );
}
