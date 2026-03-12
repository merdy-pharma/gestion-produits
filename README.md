Version 1 à 4 : 
* Customisation des constantes d'affichage sur l'entete de la facture et le titre de la page d'accueil.

Version 5 :

* Suppression de la logique recherche par numéro de téléphone
* Saisie directe du nom du client lors de la vente
* Adaptation du duplicata
* Modification de la structure de la table "Sales", ajout de la colonne "customer_name"
* Modification de la RPC : Fonction "create_sale_transaction_ph"

Version 6 et 7 :
* Correction facture pour impression adaptée sur Z91

Version 8 - 10
* Activation choix des thèmes : clair / sombre

Version 11 - 16
* Amélioration Gestion des lots (product_batches)
* Refactorisation de sales.tsx
* Modification de la RPC create_sale_transaction_ph
* Modification affichage des produits à la vente (seulement les produits en stock s'affichent)