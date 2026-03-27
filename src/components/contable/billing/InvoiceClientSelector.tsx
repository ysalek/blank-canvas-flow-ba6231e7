
import { useState } from "react";
import { Cliente } from "./BillingData";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClienteForm from "../clients/ClienteForm";
import { ChevronsUpDown, Plus, Check, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InvoiceClientSelectorProps {
  clientes: Cliente[];
  selectedCliente: Cliente | null;
  onSelectCliente: (cliente: Cliente) => void;
  onAddNewClient: (cliente: Cliente) => Promise<void> | void;
  error?: string;
  disabled?: boolean;
}

const InvoiceClientSelector = ({
  clientes,
  selectedCliente,
  onSelectCliente,
  onAddNewClient,
  error,
  disabled = false,
}: InvoiceClientSelectorProps) => {
  const [openCombobox, setOpenCombobox] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  const handleSaveNewClient = async (cliente: Cliente) => {
    try {
      setSavingClient(true);
      await Promise.resolve(onAddNewClient(cliente));
      onSelectCliente(cliente);
      setShowNewClientDialog(false);
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cliente *</Label>
        <div className="flex items-center gap-2">
          <Popover
            open={openCombobox}
            onOpenChange={(open) => {
              if (!disabled && !savingClient) {
                setOpenCombobox(open);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className={`w-full justify-between ${error ? "border-red-500" : ""}`}
                disabled={disabled || savingClient}
              >
                {selectedCliente
                  ? `${selectedCliente.nombre} - ${selectedCliente.nit}`
                  : "Seleccionar cliente..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente por nombre o NIT..." />
                <CommandList>
                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                  <CommandGroup>
                    {clientes.map((cliente) => (
                      <CommandItem
                        key={cliente.id}
                        value={`${cliente.nombre} ${cliente.nit}`}
                        onSelect={() => {
                          onSelectCliente(cliente);
                          setOpenCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCliente?.id === cliente.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {cliente.nombre} - {cliente.nit}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewClientDialog(true)}
            disabled={disabled || savingClient}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>
      <Dialog
        open={showNewClientDialog}
        onOpenChange={(open) => {
          if (!savingClient && !disabled) {
            setShowNewClientDialog(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm 
            onSave={handleSaveNewClient} 
            onCancel={() => setShowNewClientDialog(false)} 
          />
        </DialogContent>
      </Dialog>
      {selectedCliente && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Email: {selectedCliente.email}</p>
            <p className="text-sm font-medium">Teléfono: {selectedCliente.telefono}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Dirección: {selectedCliente.direccion}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceClientSelector;
