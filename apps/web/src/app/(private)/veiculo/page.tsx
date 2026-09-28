import { VehicleView } from '@/features/vehicle/vehicle-view';
export default function VehiclePage() {
  return (
    <section className="page">
      <p className="eyebrow">Seu carro</p>
      <h1>Veículo</h1>
      <p className="page-subtitle">Dados do veículo usado nos seus lançamentos.</p>
      <VehicleView />
    </section>
  );
}
