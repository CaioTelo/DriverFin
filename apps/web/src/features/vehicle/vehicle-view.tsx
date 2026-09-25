'use client';
import { type FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  createVehicle,
  getFuels,
  getVehicle,
  type CatalogItem,
  type Vehicle,
} from '@/lib/api-client';

export function VehicleView() {
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [fuels, setFuels] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([getVehicle(), getFuels()])
      .then(([result, catalog]) => {
        setVehicle(result.vehicle);
        setFuels(catalog.items);
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'Não foi possível carregar o veículo.',
        ),
      );
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const created = await createVehicle({
        brand: String(data.get('brand')),
        model: String(data.get('model')),
        year: Number(data.get('year')),
        fuel: String(data.get('fuel')),
        plate: String(data.get('plate')).trim() || null,
      });
      setVehicle(created);
      setSuccess('Veículo cadastrado com sucesso.');
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Não foi possível cadastrar o veículo.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (vehicle === undefined && !error) return <p aria-busy="true">Carregando veículo…</p>;
  if (vehicle)
    return (
      <>
        <p className="success" role="status">
          {success ?? 'Veículo cadastrado'}
        </p>
        <dl className="details card">
          <div>
            <dt>Marca</dt>
            <dd>{vehicle.brand}</dd>
          </div>
          <div>
            <dt>Modelo</dt>
            <dd>{vehicle.model}</dd>
          </div>
          <div>
            <dt>Ano</dt>
            <dd>{vehicle.year}</dd>
          </div>
          <div>
            <dt>Combustível</dt>
            <dd>{fuels.find((item) => item.id === vehicle.fuel)?.name ?? vehicle.fuel}</dd>
          </div>
          <div>
            <dt>Placa</dt>
            <dd>{vehicle.plate ?? 'Não informada'}</dd>
          </div>
        </dl>
      </>
    );
  return (
    <form className="domain-form card" onSubmit={submit} noValidate>
      <h2>Cadastre seu veículo</h2>
      <p>Você pode usar ganhos e despesas mesmo sem cadastrar um veículo.</p>
      <label htmlFor="vehicle-brand">Marca</label>
      <input id="vehicle-brand" name="brand" required maxLength={100} />
      <label htmlFor="vehicle-model">Modelo</label>
      <input id="vehicle-model" name="model" required maxLength={100} />
      <label htmlFor="vehicle-year">Ano</label>
      <input
        id="vehicle-year"
        name="year"
        type="number"
        required
        min={1900}
        max={new Date().getFullYear() + 1}
      />
      <label htmlFor="vehicle-fuel">Combustível</label>
      <select id="vehicle-fuel" name="fuel" required defaultValue="">
        <option value="" disabled>
          Selecione
        </option>
        {fuels.map((fuel) => (
          <option key={fuel.id} value={fuel.id}>
            {fuel.name}
          </option>
        ))}
      </select>
      <label htmlFor="vehicle-plate">
        Placa <span>(opcional)</span>
      </label>
      <input id="vehicle-plate" name="plate" maxLength={10} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy}>{busy ? 'Salvando…' : 'Salvar veículo'}</button>
    </form>
  );
}
