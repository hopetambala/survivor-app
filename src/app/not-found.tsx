import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page page--centered">
      <div className="cl-dlite-text-center" style={{ maxWidth: "32rem" }}>
        <dl-heading level={1}>Page not found</dl-heading>
        <dl-text color="secondary">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </dl-text>
        <div className="cl-dlite-sem-mt-400">
          <Link href="/" className="cl-dlite-no-underline">
            <dl-button variant="primary" size="md">
              Go home
            </dl-button>
          </Link>
        </div>
      </div>
    </main>
  );
}
