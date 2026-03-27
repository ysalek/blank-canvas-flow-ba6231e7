
import { Button } from "@/components/ui/button";
import { Eye, Send } from "lucide-react";

interface InvoiceActionsProps {
  onPreview: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
}

const InvoiceActions = ({
  onPreview,
  onSubmit,
  disabled = false,
  submitLabel = "Crear Factura",
}: InvoiceActionsProps) => {
  return (
    <div className="flex justify-end gap-4">
      <Button variant="outline" onClick={onPreview} disabled={disabled}>
        <Eye className="w-4 h-4 mr-2" />
        Vista Previa
      </Button>
      <Button onClick={onSubmit} disabled={disabled}>
        <Send className="w-4 h-4 mr-2" />
        {submitLabel}
      </Button>
    </div>
  );
};

export default InvoiceActions;
