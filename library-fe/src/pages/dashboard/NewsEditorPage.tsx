import NewsEditorForm from "./components/NewsEditorForm";

export default function NewsEditorPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <NewsEditorForm
          onBack={() => window.history.back()}
          onSuccess={() => window.history.back()}
        />
      </div>
    </div>
  );
}
