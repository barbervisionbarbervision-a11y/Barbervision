import ClienteFlowNav from "@/components/ClienteFlowNav";

export default function BarbeariaLayout({ children }) {
  return (
    <>
      <ClienteFlowNav />
      {children}
    </>
  );
}
