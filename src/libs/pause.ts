export default async function pause(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
