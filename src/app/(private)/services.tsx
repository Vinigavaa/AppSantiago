import { PlaceholderScreen } from "@/features/client-home/components/PlaceholderScreen"

// Área de gerenciamento dos serviços do profissional (contratados, em andamento,
// concluídos). Estrutura preparada; integração em etapa futura.
export default function Services() {
  return (
    <PlaceholderScreen
      emptyDescription="Os serviços que você atender aparecerão aqui — contratados, em andamento e concluídos."
      emptyTitle="Nenhum serviço ainda"
      icon="construct-outline"
      title="Serviços"
    />
  )
}
