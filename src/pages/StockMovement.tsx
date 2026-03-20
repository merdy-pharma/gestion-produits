import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import StockMovementHistory from "@/pages/StockMovementHistory";

interface Product {
  id: string;
  name: string;
  sellable_stock: number;
  expired_stock: number;
  total_stock: number;
}

const REASONS = ["APPRO", "ENDOMMAGE", "PERIME", "PERTE", "RETOUR", "AJUSTEMENT"];

export default function StockMovement() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [type, setType] = useState<"IN" | "OUT">("OUT");
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 🔍 Recherche PRODUIT (avec vrai stock)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("products_with_stock")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(10);

      if (data) setResults(data);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // 🚀 SUBMIT
  const handleSubmit = async () => {
    if (!selected || quantity <= 0 || !reason) {
      toast.error("Champs obligatoires manquants");
      return;
    }

    if (type === "OUT" && quantity > selected.sellable_stock) {
      toast.error("Stock insuffisant (non expiré)");
      return;
    }

    setLoading(true);

    try {
      // ✅ INSERT UNIQUEMENT mouvement
      const { error } = await supabase.from("stock_movements").insert({
        product_id: selected.id,
        type,
        reason,
        quantity,
        comment,
      });

      if (error) throw error;

      toast.success("Mouvement enregistré");

      // Reset
      setSelected(null);
      setQuery("");
      setResults([]);
      setQuantity(1);
      setReason("");
      setComment("");

    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du mouvement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ================= FORMULAIRE ================= */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-4">

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Mouvement de stock</h2>

          <Button
            variant="outline"
            onClick={() => setShowHistory(s => !s)}
          >
            {showHistory ? "Masquer historique" : "Voir historique"}
          </Button>
        </div>

        {/* 🔍 Recherche */}
        <div className="relative">
          <label className="text-sm font-medium">Produit</label>
          <Input
            placeholder="Rechercher (min 2 lettres)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
          />

          {/* Résultats */}
          {results.length > 0 && (
            <div className="absolute z-10 bg-white dark:bg-gray-700 border w-full mt-1 rounded shadow max-h-48 overflow-auto">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => {
                    setSelected(p);
                    setQuery(p.name);
                    setResults([]);
                  }}
                >
                  <div className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-sm text-gray-500">
                      {p.sellable_stock} dispo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📦 Infos stock */}
        {selected && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
            <div className="flex justify-between">
              <span>Stock valide</span>
              <span className="text-green-600 font-bold">
                {selected.sellable_stock}
              </span>
            </div>

            {selected.expired_stock > 0 && (
              <div className="flex justify-between text-red-500">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={14} /> Expiré
                </span>
                <span>{selected.expired_stock}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-400 text-xs">
              <span>Total</span>
              <span>{selected.total_stock}</span>
            </div>
          </div>
        )}

        {/* Type */}
        <div>
          <label className="text-sm">Type</label>
          <select
            className="input w-full"
            value={type}
            onChange={(e) => setType(e.target.value as "IN" | "OUT")}
          >
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
          </select>
        </div>

        {/* Motif */}
        <div>
          <label className="text-sm">Motif</label>
          <select
            className="input w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Choisir</option>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Quantité */}
        <div>
          <label className="text-sm">Quantité</label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        {/* Commentaire */}
        <Input
          placeholder="Commentaire (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Bouton */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Traitement..." : "Valider"}
        </Button>
      </div>

      {/* ================= HISTORIQUE ================= */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 max-h-[80vh] overflow-auto">
          <StockMovementHistory />
        </div>
      )}
    </div>
  );
}