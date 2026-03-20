import React, { forwardRef } from 'react';

interface ReceiptProps {
  cart: { name: string; quantity: number; price: number; batch_number?: string }[];
  total: number;
  customerName: string | null;
  paymentMethod: string;
  date: string;
  invoiceNumber: string;
  userName: string;
  exchangeRate?: number;
}

const TAX_RATE = 0.0;

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ cart, total, customerName, paymentMethod, date, invoiceNumber, userName, exchangeRate }, ref) => {
    const totalHT = total / (1 + TAX_RATE);
    const taxAmount = total - totalHT;

    const formattedDate = new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const formatCurrency = (value: number) => {
      return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const paymentMethodLabel = {
      cash: 'ESPÈCES',
      card: 'CARTE BANCAIRE',
      mobile: 'MOBILE MONEY',
    }[paymentMethod as keyof typeof paymentMethodLabel] || paymentMethod.toUpperCase();

    return (
      <>
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              height: auto;
              width: 100%;
            }

            .pos-receipt {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 3mm !important;
              font-size: 11pt !important;
              font-family: 'Courier New', monospace !important;
              line-height: 1.3 !important;
              color: black !important;
              background: white !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
            }

            .pos-receipt * {
              page-break-inside: avoid !important;
            }

            .pos-header,
            .pos-items,
            .pos-footer {
              page-break-inside: avoid !important;
            }

            .pos-item {
              page-break-inside: avoid !important;
            }

            .pos-divider {
              border: none;
              border-top: 1px dashed #000;
              margin: 2mm 0;
              padding: 0;
              page-break-inside: avoid !important;
            }

            .no-print {
              display: none !important;
            }
          }

          @media screen {
            .pos-receipt {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
          }
        `}</style>

        <div
          ref={ref}
          className="pos-receipt"
          style={{
            backgroundColor: '#fff',
            color: '#000',
            fontSize: '12px',
            fontFamily: "'Courier New', monospace",
            lineHeight: '1.3',
            border: '1px solid #e0e0e0',
            pageBreakAfter: 'avoid',
          }}
        >
          {/* Header Section */}
          <div className="pos-header" style={{ textAlign: 'center', marginBottom: '3mm' }}>
            {/* Company Name */}
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
                letterSpacing: '1px',
                marginBottom: '2px',
                textTransform: 'uppercase',
              }}
            >
              MERDY PHARMA
            </div>

            {/* Company Info */}
            <div style={{ fontSize: '10px', lineHeight: '1.2', color: '#333', marginBottom: '2px' }}>
              <div>RCCM 20-A-00047</div>
              <div>ID.NAT 01-93-N40495R</div>
              <div>Av. Bolenge, C. Masina</div>
            </div>

            {/* Separator */}
            <hr className="pos-divider" />

            {/* Invoice Details */}
            <div style={{ fontSize: '11px', marginTop: '2px', marginBottom: '2px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px', margin: '1px 0' }}>
                Facture: {invoiceNumber}
              </div>
              <div style={{ margin: '1px 0' }}>
                {formattedDate}
              </div>
            </div>

            {/* Separator */}
            <hr className="pos-divider" />

            {/* Transaction Details */}
            <div style={{ fontSize: '10px', textAlign: 'left', marginTop: '2px' }}>
              <div style={{ marginBottom: '1px' }}>
                <span style={{ display: 'inline-block', width: '30%', fontWeight: 'bold' }}>Client:</span>
                <span style={{ wordBreak: 'break-word' }}>
                  {(customerName || 'Client Anonyme').substring(0, 25).toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: '1px' }}>
                <span style={{ display: 'inline-block', width: '30%', fontWeight: 'bold' }}>Paiement:</span>
                <span>{paymentMethodLabel}</span>
              </div>
              <div style={{ marginBottom: '1px' }}>
                <span style={{ display: 'inline-block', width: '30%', fontWeight: 'bold' }}>Caissier:</span>
                <span>{userName.substring(0, 15)}</span>
              </div>
              {exchangeRate && (
                <div>
                  <span style={{ display: 'inline-block', width: '30%', fontWeight: 'bold' }}>Taux:</span>
                  <span>{formatCurrency(exchangeRate)} CDF/USD</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="pos-items" style={{ marginTop: '3mm', marginBottom: '3mm' }}>
            {/* Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
                gap: '2px',
                borderBottom: '1px dashed #000',
                paddingBottom: '2px',
                marginBottom: '2px',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              <div>Désignation</div>
              <div style={{ textAlign: 'center' }}>Qté</div>
              <div style={{ textAlign: 'right' }}>P.U</div>
              <div style={{ textAlign: 'right' }}>Total</div>
            </div>

            {/* Items */}
            {cart.map((item, index) => {
              const price = Number(item.price);
              const lineTotal = price * item.quantity;
              const itemName = item.name.toUpperCase().substring(0, 30);

              return (
                <div key={index} className="pos-item" style={{ marginBottom: '2px', pageBreakInside: 'avoid' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
                      gap: '2px',
                      fontSize: '10px',
                      lineHeight: '1.2',
                    }}
                  >
                    <div style={{ wordBreak: 'break-word', wordWrap: 'break-word' }}>
                      {itemName}
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {item.quantity}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px' }}>
                      {formatCurrency(price)}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Separator */}
          <hr className="pos-divider" style={{ marginTop: '2mm', marginBottom: '2mm' }} />

          {/* Totals Section */}
          <div className="pos-footer" style={{ fontSize: '11px', marginBottom: '3mm' }}>
            {/* Subtotal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1px',
                paddingBottom: '1px',
              }}
            >
              <span>Sous-Total HT:</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(totalHT)} Fc</span>
            </div>

            {/* Tax */}
            {taxAmount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '1px',
                  paddingBottom: '1px',
                  fontSize: '10px',
                  color: '#666',
                }}
              >
                <span>TVA (0%):</span>
                <span>{formatCurrency(taxAmount)} Fc</span>
              </div>
            )}

            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '2px',
                paddingTop: '2px',
                borderTop: '1px solid #000',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              <span>TOTAL TTC:</span>
              <span>{formatCurrency(total)} Fc</span>
            </div>
          </div>

          {/* Separator */}
          <hr className="pos-divider" />

          {/* Footer Message */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '10px',
              marginTop: '2mm',
              marginBottom: '1mm',
              fontWeight: '500',
              letterSpacing: '0.5px',
            }}
          >
            ━━━━━━━━━━━━━━━━━━━━
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              marginBottom: '1mm',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            Merci pour votre achat !
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '9px',
              color: '#666',
              marginBottom: '2mm',
            }}
          >
            Revenez bientôt
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '10px',
              marginBottom: '2mm',
              fontWeight: '500',
              letterSpacing: '0.5px',
            }}
          >
            ━━━━━━━━━━━━━━━━━━━━
          </div>

          {/* Cut Line */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#999', marginBottom: '3mm' }}>
            ✂ - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
