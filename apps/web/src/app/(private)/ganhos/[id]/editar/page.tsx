import { EarningEditor } from '@/features/earnings/earning-editor';
export default async function EditEarningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="page narrow">
      <p className="eyebrow">Receitas</p>
      <h1>Detalhes do ganho</h1>
      <EarningEditor id={id} />
    </section>
  );
}
