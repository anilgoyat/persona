import Layout from "./Layout";
import SourcesPanel from "./SourcesPanel";
import ChatPanel from "./ChatPanel";

export default function RagPage() {
  return (
    <Layout>
      <SourcesPanel />
      <ChatPanel />
    </Layout>
  );
}
