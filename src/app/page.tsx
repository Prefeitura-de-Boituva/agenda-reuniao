import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-h2 font-bold text-neutral-900 flex items-center gap-2">
          <CalendarDays className="size-7 text-primary" />
          Agenda de Reuniões
        </h1>
        <p className="text-body text-neutral-500">
          Gerencie as salas e horários de reunião da Prefeitura de Boituva.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Salas Disponíveis
          </h2>
          <p className="text-h1 font-bold text-primary">5</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Reuniões Hoje
          </h2>
          <p className="text-h1 font-bold text-primary">8</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Horários Ocupados
          </h2>
          <p className="text-h1 font-bold text-primary">12</p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-card border border-neutral-200 max-w-md">
        <h2 className="text-h3 font-semibold text-neutral-900">
          Componentes do Design System
        </h2>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-caption font-medium text-neutral-700">Botões</h3>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
          </div>
          <Button loading>Carregando...</Button>
          <Button disabled>Desabilitado</Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-caption font-medium text-neutral-700">Inputs</h3>
          <Input label="Nome da Sala" placeholder="Ex: Sala Azul" />
          <Input
            label="Buscar"
            placeholder="Pesquisar..."
            helperText="Digite pelo menos 3 caracteres"
          />
          <Input label="Campo com erro" placeholder="..." error="Este campo é obrigatório" />
        </div>
      </section>
    </div>
  );
}