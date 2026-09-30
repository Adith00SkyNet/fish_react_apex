# DELFISH

React frontend for the fish shop, designed to sit beside Oracle APEX and ORDS. Without `VITE_ORDS_BASE_URL` set, every screen falls back to local preview data/actions so the whole app (admin, customer, delivery) can be reviewed with no backend. Once the env var is set, the same screens call ORDS instead — no code changes needed.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_ORDS_BASE_URL` in a local `.env` file when ORDS is available:

```bash
VITE_ORDS_BASE_URL=https://oracleapex.com/ords/skynetspace/api/v1
```

## Integration layer

- `src/types/api.ts` — raw DTOs matching the ORDS/PL/SQL JSON shape (lower snake_case, mirroring the Oracle column names). If the real modules emit a different shape, this is the one file to adjust.
- `src/utils/mappers.ts` — maps DTOs to the frontend view models in `src/types/product.ts`.
- `src/api/client.ts` — Axios instance (Bearer token from `localStorage.fishshop_access_token`, auto-attached; dispatches a `fishshop:unauthorized` event on 401) plus typed methods for every endpoint in the plan: `authApi`, `catalogApi`, `orderApi`, `deliveryApi`, `adminApi` (products, media upload, price-list parse/publish, order assignment).
- `src/context/AuthContext.tsx` and `src/context/CartContext.tsx` — the app's only state for auth and the basket; every screen reads from these instead of local state.
- `src/hooks/useCatalog.ts` — fetches categories/products from ORDS and falls back to `src/data/products.ts` demo data on failure or when the API isn't configured.
- `src/utils/priceListParser.ts` — client-side paste-and-parse for the WhatsApp-style price broadcast (mirrors the server-side `/admin/price-lists/parse` contract so the admin tool works before that endpoint exists).

Every screen that hits the network (`CatalogSection`, `OrdersOverview`, `OrderHistory`, `PriceListImport`, `DeliveryPartnerDashboard`, `AddCatchForm`, checkout in `CartDrawer`) checks `isApiConfigured` from `api/client.ts` and degrades to demo data or a simulated action rather than breaking, so the same build works for design review and for a live ORDS environment.

## APEX deployment

Run `npm run build`, then upload the contents of `dist/` to APEX Static Application Files or an ORDS static resource module. Set the deployed app's base path in the APEX hosting configuration if the app is served below a nested URL. The default API path is same-origin at `/ords/fishshop/api/v1`.

## Included frontend surface

- Responsive admin workspace: catalog, live-fetched orders table, delivery desk, product management (with real ORDS product/media creation), and the price-list paste-and-parse tool
- Bilingual product cards with category tabs and search, backed by `GET /categories` + `GET /products`
- Cart with quantity stepper and a full checkout flow that posts to `POST /orders` and snapshots price/qty per item
- Customer order history via `GET /orders/my`
- Delivery partner dashboard reading `GET /delivery/orders` and updating status via `PUT /delivery/orders/:id/status`

## Known gaps (not yet wired)

- No client-side router — navigation is in-memory tab state, not URL-addressable. `react-router-dom` is installed but unused; introducing routes is a bigger refactor left for a follow-up.
- `DeliveryModule.tsx` (admin's "create delivery" tool) is still local-only demo data — the schema in the plan has no standalone deliveries entity, only `ORDERS.delivery_person_id`, so this screen should be redesigned to assign existing orders rather than invent ad hoc routes.
- Auth token refresh isn't implemented; a 401 just logs the user out.
