import { EarningEditor } from '@/features/earnings/earning-editor';
export default async function EditEarningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="page narrow">
      <p className="eyebrow">Receitas</p>
      <h1>Editar ganho</h1>
      <p className="page-subtitle">Revise ou atualize os dados deste lançamento.</p>
      <EarningEditor id={id} />
    </section>
  );
}
