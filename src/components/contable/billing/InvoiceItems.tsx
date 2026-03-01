
import { ItemFactura } from "./BillingData";
import { Producto } from "../products/ProductsData";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import InvoiceItemRow from "./InvoiceItemRow";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";

interface InvoiceItemsProps {
  items: ItemFactura[];
  productos: Producto[];
  updateItem: (index: number, field: string, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  error?: string;
  onCreateProduct?: (index: number) => void;
}

const InvoiceItems = ({ items, productos, updateItem, addItem, removeItem, error, onCreateProduct }: InvoiceItemsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Ítems de la Factura</h3>
        <Button onClick={addItem} size="sm" type="button">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Ítem
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      <Card>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">Producto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[100px]">Cantidad</TableHead>
                    <TableHead className="w-[120px]">P. Unitario</TableHead>
                    <TableHead className="w-[120px]">Descuento</TableHead>
                    <TableHead className="w-[120px]">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => (
                <InvoiceItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    productos={productos}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    itemCount={items.length}
                    onCreateProduct={onCreateProduct}
                />
                ))}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default InvoiceItems;
