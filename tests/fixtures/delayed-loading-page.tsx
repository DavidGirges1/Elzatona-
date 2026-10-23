// Installed temporarily by scripts/verify-loading.mjs; never deployed as an app route.
export default async function DelayedLoadingFixture() {
  await new Promise((resolve) => setTimeout(resolve, 8000));
  return <h1>Loading verification complete</h1>;
}
