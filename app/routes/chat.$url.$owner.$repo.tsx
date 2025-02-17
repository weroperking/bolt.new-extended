import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  return json({
    id: args.params.url + "/" + args.params.owner + "/" + args.params.repo
  });
}

export default IndexRoute;
