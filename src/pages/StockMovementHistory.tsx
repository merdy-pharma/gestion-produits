import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import toast from "react-hot-toast";

interface Movement {
  id: string;
  type: "IN" | "OUT";
  reason: string;
  quantity: number;
  created_at: string;
  comment?: string;

  product: {
    name: string;
  };

  batch?: {
    batch_number: string;
    expiry_date: string;
  };

  sale?: {
    id: string;
  };
}

export default function StockMovementHistory() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  // filtres
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ---------------- FETCH ----------------
  const fetchMovements = async () => {
    setLoading(true);

    let query = supabase
      .from("stock_movements")
      .select(`
        *,
        product:products(name),
        batch:product_batches(batch_number, expiration_date),
        sale:sales(id)
      `)
      .order("created_at", { ascending: false });

    if (type) query = query.eq("type", type);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Erreur chargement historique");
    } else {
      setMovements(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMovements();
  }, [type, dateFrom, dateTo]);

  // ---------------- EXPORT EXCEL ----------------
  const exportExcel = async () => {
    const xlsx = await import("xlsx");

    const data = movements.map((m) => ({
      Produit: m.product?.name,
      Type: m.type,
      Motif: m.reason,
      Quantité: m.quantity,
      Lot: m.batch?.batch_number || "-",
      Expiration: m.batch?.expiration_date || "-",
      Date: format(new Date(m.created_at), "dd/MM/yyyy HH:mm"),
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Historique");

    xlsx.writeFile(wb, "historique_stock.xlsx");
  };

  // ---------------- FILTER LOCAL ----------------
  const filtered = movements.filter((m) =>
    m.product?.name.toLowerCase().includes(search.toLowerCase())
  );

  // ---------------- BADGE COLOR ----------------
  const getBadge = (reason: string) => {
    if (reason === "VENTE") return "bg-blue-500";
    if (reason === "PERTE") return "bg-red-500";
    if (reason === "PERIME") return "bg-orange-500";
    if (reason === "APPRO") return "bg-green-600";
    return "bg-gray-500";
  };

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Historique des mouvements</h2>

        <Button onClick={exportExcel} className="flex gap-2">
          <FileDown size={16} />
          Export Excel
        </Button>
      </div>

      {/* FILTRES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <Input
          placeholder="Recherche produit"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tous types</option>
          <option value="IN">Entrée</option>
          <option value="OUT">Sortie</option>
        </select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {/* LISTE */}
      <div className="space-y-2 max-h-[70vh] overflow-auto">

        {filtered.map((m) => (
          <div
            key={m.id}
            className="p-3 rounded-lg border bg-white dark:bg-gray-800 shadow-sm"
          >
            <div className="flex justify-between">

              <div>
                <div className="font-semibold">
                  {m.product?.name}
                </div>

                <div className="text-sm text-gray-500">
                  {format(new Date(m.created_at), "dd MMM yyyy - HH:mm")}
                </div>

                {/* LOT */}
                {m.batch && (
                  <div className="text-xs text-gray-400">
                    Lot: {m.batch.batch_number} | Exp: {m.batch.expiration_date}
                  </div>
                )}
              </div>

              <div className="text-right">

                <div className={`text-white px-2 py-1 rounded text-xs ${getBadge(m.reason)}`}>
                  {m.reason}
                </div>

                <div className={`font-bold mt-1 ${
                  m.type === "OUT" ? "text-red-500" : "text-green-600"
                }`}>
                  {m.type === "OUT" ? "-" : "+"}{m.quantity}
                </div>
              </div>

            </div>

            {/* COMMENT */}
            {m.comment && (
              <div className="text-xs mt-2 text-gray-500">
                {m.comment}
              </div>
            )}

            {/* LIEN VENTE */}
            {m.reason === "VENTE" && m.reference_id && (
              <div className="text-xs text-blue-500 mt-1 cursor-pointer">
                Réf. vente #{m.reference_id}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 p-4">
            Aucun mouvement trouvé
          </div>
        )}
      </div>
    </div>
  );
}