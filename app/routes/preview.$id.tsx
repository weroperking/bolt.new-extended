import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useRef } from 'react';

export async function loader(args: LoaderFunctionArgs) {
  if (!args.params.id) {
    return json({ error: 'Invalid preview ID' }, { status: 400 });
  }

  return { previewId: args.params.id };
}

export default function Preview() {
  const { previewId } = useLoaderData<typeof loader>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = `https://${previewId}.local-corp.webcontainer-api.io`;
    }
  }, []);
  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
      />
    </div>
  );
}
