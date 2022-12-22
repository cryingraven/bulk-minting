import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";
import { NearWallet } from "../lib/NearWallet";
interface SuccessDialogProps {
  txHash: string;
  wallet: NearWallet;
}

export default function SuccessDialog({ txHash, wallet }: SuccessDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [contractId, setContractId] = useState("");
  const downloadPrivateKey = async () => {
    const accesKey = await wallet.getAccessKey(contractId.split(".")[0]);
    if (accesKey == null) {
      return;
    }
    const blob = new Blob([accesKey.toString()], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${contractId}.txt`;
    link.click();
  };
  const checkResult = async (txHash: any) => {
    await wallet.startUp();
    const result = (await wallet.getTransactionResult(txHash)) as string;
    if (
      result != null &&
      result.includes(process.env.NEXT_PUBLIC_CONTRACT_NAME || "")
    ) {
      setContractId(result);
    }
  };
  useEffect(() => {
    checkResult(txHash);
  }, [txHash]);
  return (
    <Dialog
      open={isOpen}
      onClose={() => {}}
      className="top-0 left-0 right-0 fixed mt-24 z-999 w-full"
    >
      <Dialog.Panel>
        <div className="mx-auto max-w-4xl p-3 bg-gray-800 text-white h-96 justify-center rounded-lg flex flex-col">
          <h6 className="text-2xl text-center my-3">Mint Process Success</h6>
          <div className="flex w-8/12 mx-auto">
            <button
              className="grow m-3 p-1 text-blue-300 font-bold text-md"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Close
            </button>
            <button
              className="grow m-3 p-1 text-red-300 font-bold text-md"
              onClick={downloadPrivateKey}
            >
              Export Private Key
            </button>
            <button
              className="grow m-3 p-1 text-green-300 font-bold text-md"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Go To Collection
            </button>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
