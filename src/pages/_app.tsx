import { AppProps } from 'next/app';
import Head from 'next/head';
import 'reactflow/dist/style.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Workflow Automation Tool</title>
        <meta name="description" content="Map and automate your business workflows" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 