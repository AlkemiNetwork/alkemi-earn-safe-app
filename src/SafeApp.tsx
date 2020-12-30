import React, { useCallback, useState } from 'react';

import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';

const SafeApp: React.FC = () => {
  const { sdk, safe } = useSafeAppsSDK();
  const [submitting, setSubmitting] = useState(false);

  const submitTx = useCallback(async () => {
    setSubmitting(true);
    try {
      const { safeTxHash } = await sdk.txs.send({
        txs: [
          {
            to: safe.safeAddress,
            value: '0',
            data: '0x',
          },
        ],
      });
      console.log({ safeTxHash });
      const safeTx = await sdk.txs.getBySafeTxHash(safeTxHash);
      console.log({ safeTx });
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  }, [safe, sdk]);

  return (
    <>
      <h2>{safe.safeAddress}</h2>
      
      {submitting ? (
        <>
          Loading...
          <br />
          <button
            onClick={() => {
              setSubmitting(false);
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <button onClick={submitTx}>
          Submit
        </button>
      )}
    </>
  );
};

export default SafeApp;
