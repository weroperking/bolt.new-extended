import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { MODEL_LIST } from '~/utils/modelConstants';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.toLowerCase() || '';

  const filteredModels = MODEL_LIST.filter((model) =>
    model.name.toLowerCase().includes(search) ||
    model.provider.toLowerCase().includes(search) ||
    model.label.toLowerCase().includes(search)
  );

  return json(filteredModels);
}
