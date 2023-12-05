import {
  CandyGuard,
  CandyMachine,
  mintV2,
} from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import {
  PublicKey,
  Transaction,
  TransactionWithMeta,
  Umi,
  createBigInt,
  generateSigner,
  none,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import {
  DigitalAsset,
  DigitalAssetWithToken,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import { mintText } from "../settings";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  SimpleGrid,
  Text,
  Tooltip,
  UseToastOptions,
  useMediaQuery,
  Input,
} from "@chakra-ui/react";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  chooseGuardToUse,
  routeBuilder,
  mintArgsBuilder,
  combineTransactions,
  GuardButtonList,
} from "../utils/mintHelper";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import React from "react";
import styled from "styled-components";


export const NumericField = styled.input`
font-size: 1.3em;
background-color: inherit;
text-align:center;
outline: none;
user-select: none;
`;

const updateLoadingText = (
  loadingText: string | undefined,
  guardList: GuardReturn[],
  label: string,
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>
) => {
  const guardIndex = guardList.findIndex((g) => g.label === label);
  if (guardIndex === -1) {
    console.error("guard not found");
    return;
  }
  const newGuardList = [...guardList];
  newGuardList[guardIndex].loadingText = loadingText;
  setGuardList(newGuardList);
};

const detectBotTax = (logs: string[]) => {
  if (logs.find((l) => l.includes("Candy Guard Botting"))) {
    throw new Error(`Candy Guard Bot Tax triggered. Check transaction`);
  }
  return false;
};

const fetchNft = async (
  umi: Umi,
  nftAdress: PublicKey,
  toast: (options: Omit<UseToastOptions, "id">) => void
) => {
  let digitalAsset: DigitalAsset | undefined;
  let jsonMetadata: JsonMetadata | undefined;
  try {
    digitalAsset = await fetchDigitalAsset(umi, nftAdress);
    jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri);
  } catch (e) {
    console.error(e);
    toast({
      title: "Nft could not be fetched!",
      description: "Please check your Wallet instead.",
      status: "error",
      duration: 9000,
      isClosable: true,
    });
  }

  return { digitalAsset, jsonMetadata };
};


const mintClick = async (
  umi: Umi,
  guard: GuardReturn,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  ownedTokens: DigitalAssetWithToken[],
  toast: (options: Omit<UseToastOptions, "id">) => void,
  mintsCreated:
    | {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
      }[]
    | undefined,
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >,
  guardList: GuardReturn[],
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
  onOpen: () => void,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>
) => {
  const guardToUse = chooseGuardToUse(guard, candyGuard);
  if (!guardToUse.guards) {
    console.error("no guard defined!");
    return;
  }
  try {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = true;
    setGuardList(newGuardList);

    let routeBuild = await routeBuilder(umi, guardToUse, candyMachine);
    if (!routeBuild) {
      routeBuild = transactionBuilder();
    }
    const nftMint = generateSigner(umi);

    const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens);
    const tx = transactionBuilder().add(
      mintV2(umi, {
        candyMachine: candyMachine.publicKey,
        collectionMint: candyMachine.collectionMint,
        collectionUpdateAuthority: candyMachine.authority,
        nftMint,
        group: guardToUse.label === "default" ? none() : some(guardToUse.label),
        candyGuard: candyGuard.publicKey,
        mintArgs,
        tokenStandard: candyMachine.tokenStandard,
      })
    );
    const groupedTx = await combineTransactions(umi, [routeBuild, tx], toast);
    if (!groupedTx || groupedTx.length === 0) {
      console.error("no transaction to send");
      return;
    }

    let lastSignature: Uint8Array | undefined;
    if (groupedTx.length > 1) {
      let counter = 0;
      for (let tx of groupedTx) {
        tx = tx.prepend(setComputeUnitLimit(umi, { units: 800_000 }));
        const { signature } = await tx.sendAndConfirm(umi, {
          confirm: { commitment: "processed" },
          send: {
            skipPreflight: true,
          },
        });
        lastSignature = signature;
        if (counter < groupedTx.length - 1) {
          updateLoadingText(
            `Transaction ${counter}/${groupedTx.length}`,
            guardList,
            guardToUse.label,
            setGuardList
          );
          toast({
            title: `Transaction ${counter}/${groupedTx.length} successful!`,
            description: `Please sign the next...`,
            status: "success",
            duration: 90000,
            isClosable: true,
          });
        }
      }
    } else {
      updateLoadingText(
        `Please sign`,
        guardList,
        guardToUse.label,
        setGuardList
      );
      let tx = groupedTx[0].prepend(
        setComputeUnitLimit(umi, { units: 800_000 })
      );
      const { signature } = await tx.sendAndConfirm(umi, {
        confirm: { commitment: "processed" },
        send: {
          skipPreflight: true,
        },
      });
      lastSignature = signature;
    }
    if (!lastSignature) {
      // throw error that no tx was created
      throw new Error("no tx was created");
    }
    updateLoadingText(
      `Finalizing transaction`,
      guardList,
      guardToUse.label,
      setGuardList
    );

    //loop umi.rpc.getTransaction(lastSignature) until it does not return null. Sleep 1 second between each try.
    let transaction: TransactionWithMeta | null = null;
    for (let i = 0; i < 30; i++) {
      transaction = await umi.rpc.getTransaction(lastSignature);
      if (transaction) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (transaction === null) {
      throw new Error(`no tx on chain for signature ${lastSignature}`);
    }

    const logs: string[] = transaction.meta.logs;
    if (!detectBotTax(logs)) {
      toast({
        title: "Mint successful!",
        description: `You can find your NFT in your wallet.`,
        status: "success",
        duration: 90000,
        isClosable: true,
      });
    }

    updateLoadingText(
      "Fetching your NFT",
      guardList,
      guardToUse.label,
      setGuardList
    );
    const fetchedNft = await fetchNft(umi, nftMint.publicKey, toast);
    if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
      if (mintsCreated === undefined) {
        setMintsCreated([
          {
            mint: nftMint.publicKey,
            offChainMetadata: fetchedNft.jsonMetadata,
          },
        ]);
      } else {
        setMintsCreated([
          ...mintsCreated,
          {
            mint: nftMint.publicKey,
            offChainMetadata: fetchedNft.jsonMetadata,
          },
        ]);
      }
      //onOpen();
    }
  } catch (e) {
    console.error(`minting failed because of ${e}`);

    toast({
      title: "Your mint failed!",
      description: "Please try again.",
      status: "error",
      duration: 9000,
      isClosable: true,
    });
  } finally {
    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = false;
    setGuardList(newGuardList);
    setCheckEligibility(true);
    updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
  }
};

// new component called timer that calculates the remaining Time based on the bigint solana time and the bigint toTime difference.
const Timer = ({
  solanaTime,
  toTime,
  setCheckEligibility,
}: {
  solanaTime: bigint;
  toTime: bigint;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
}) => {
  const [remainingTime, setRemainingTime] = useState<bigint>(
    toTime - solanaTime
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        return prev - BigInt(1);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  //convert the remaining time in seconds to the amount of days, hours, minutes and seconds left
  const days = remainingTime / BigInt(86400);
  const hours = (remainingTime % BigInt(86400)) / BigInt(3600);
  const minutes = (remainingTime % BigInt(3600)) / BigInt(60);
  const seconds = remainingTime % BigInt(60);
  if (days > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold" display="flex">
        <span className="timer-details">
          {days.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {hours.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {minutes.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {seconds.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
      </Text>
    );
  }
  if (hours > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold" display="flex">
        <span className="timer-details">
          {hours.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {minutes.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {seconds.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
      </Text>
    );
  }
  if (minutes > BigInt(0) || seconds > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold" display="flex">
        <span className="timer-details">
          {minutes.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
        <span className="timer-details">
          {seconds.toLocaleString("en-US", {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })}
        </span>
      </Text>
    );
  }
  if (remainingTime === BigInt(0)) {
    setCheckEligibility(true);
  }
  return <Text></Text>;
};

type Props = {
  umi: Umi;
  guardList: GuardReturn[];
  candyMachine: CandyMachine | undefined;
  candyGuard: CandyGuard | undefined;
  ownedTokens: DigitalAssetWithToken[] | undefined;
  toast: (options: Omit<UseToastOptions, "id">) => void;
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>;
  mintsCreated:
    | {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
      }[]
    | undefined;
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >;
  onOpen: () => void;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
};
function findMintLimit(data: any, targetLabel: string) {
  // Iterate over each group in the data
  for (const group of data.groups) {
    // Check if the current group has the target label
    if (group.label === targetLabel) {
      // Check if sol payment exists in the current grou
      if (group.guards["mintLimit"]) {
        // Extract the limit and send it backt
        if (group.guards["mintLimit"]?.value?.limit)
          return group.guards["mintLimit"].value.limit;
        else {
          return "UNLIMITED";
        }
      } else {
        // Return 0 if there is no limit
        return -1;
      }
    }
  }

  // Return null if the target label is not found in any group
  return null;
}
function findMintedByYou(data: any, targetLabel: string) {
  // Iterate over each group in the data
  for (const group of data.groups) {
    // Check if the current group has the target label
    if (group.label === targetLabel) {
      // Check if sol payment exists in the current group
      if (group.guards["redeemedAmount"]) {
        // Extract the limit and send it backt
        if (group.guards["redeemedAmount"] == 3)
          return group.guards["redeemedAmount"];
        else {
          return "UNLIMITED";
        }
      } else {
        // Return 0 if there is no limit
        return 0;
      }
    }
  }

  // Return null if the target label is not found in any group
  return null;
}
function findSolPaymentPrice(data: any, targetLabel: string) {
  // Iterate over each group in the data
  for (const group of data.groups) {
    // Check if the current group has the target label
    if (group.label === targetLabel) {
      // Check if sol payment exists in the current group
      if (group.guards["solPayment"]) {
        // console.log("matched guard price",Number(group.guards['solPayment'].value.lamports.basisPoints)/1e9)

        // Extract and return the lamports value for sol payment
        return (
          Number(group.guards["solPayment"].value.lamports.basisPoints) / 1e9
        );
      } else {
        // Return null if sol payment is not found in the current group
        return null;
      }
    }
  }

  // Return null if the target label is not found in any group
  return null;
}
type NumberOfNftsState = Record<string, number>;

export function ButtonList({
  umi,
  guardList,
  candyMachine,
  candyGuard,
  ownedTokens = [], // provide default empty array
  toast,
  setGuardList,
  mintsCreated,
  setMintsCreated,
  onOpen,
  setCheckEligibility,
}: Props): JSX.Element {
  const solanaTime = useSolanaTime();
  const [isSmallerThan1100px] = useMediaQuery("(max-width: 1100px)");
  const [isSmallerThan650px] = useMediaQuery("(max-width: 650px)");
  const [numberOfNfts, setNumberOfNfts] = useState<NumberOfNftsState>({});


  if (!candyMachine || !candyGuard) {
    return <></>;
  }
  let filteredGuardlist = guardList.filter(
    (elem, index, self) =>
      index === self.findIndex((t) => t.label === elem.label)
  );
  if (filteredGuardlist.length === 0) {
    return <></>;
  }
  // Guard "default" can only be used to mint in case no other guard exists
  if (filteredGuardlist.length > 1) {
    filteredGuardlist = guardList.filter((elem) => elem.label != "default");
  }
  let buttonGuardList = [];
  for (const guard of filteredGuardlist) {
    const text = mintText.find((elem) => elem.label === guard.label);
    // find guard by label in candyGuard
    const group = candyGuard.groups.find((elem) => elem.label === guard.label);
    let startTime = createBigInt(0);
    let endTime = createBigInt(0);
    if (group) {
      if (group.guards.startDate.__option === "Some") {
        startTime = group.guards.startDate.value.date;
      }
      if (group.guards.endDate.__option === "Some") {
        endTime = group.guards.endDate.value.date;
      }
    }

    let buttonElement: GuardButtonList = {
      label: guard ? guard.label : "default",
      allowed: guard.allowed,
      mintedByYou:
        findMintedByYou(candyGuard, guard ? guard.label : "default") ||
        "Something went wrong",
      mintLimit:
        findMintLimit(candyGuard, guard ? guard.label : "default") ||
        "Something went wrong",
      price:
        findSolPaymentPrice(candyGuard, guard ? guard.label : "default") || -1,
      header: text ? text.header : "header missing in settings.tsx",
      mintText: text ? text.mintText : "mintText missing in settings.tsx",
      buttonLabel: text
        ? text.buttonDisabledLabel
        : "buttonDisabledLabel missing in settings.tsx",
      buttonDisabledLabel: "",
      startTime,
      endTime,
      tooltip: guard.reason,
      gateKeeperNetwork: group?.guards.gatekeeper.__option || "",
    };
    buttonGuardList.push(buttonElement);
  }

  const listItems = buttonGuardList.map((buttonGuard, index) => (
    <Box
      key={index}
      padding={isSmallerThan650px ? "0.25rem" : "1rem"}
      marginTop={"20px"}
      border="1px solid #fff"
      width="100%"
      borderRadius="4px"
      color="white"
    >
      <HStack marginBottom="12px" margin=".75rem">
        <Heading
          size={isSmallerThan650px ? "sm" : "md"}
          textTransform="uppercase"
        >
          {buttonGuard.header}
        </Heading>
        <Flex justifyContent="flex-end" marginLeft="auto">
          {buttonGuard.endTime > createBigInt(0) &&
            buttonGuard.endTime - solanaTime > createBigInt(0) &&
            (!buttonGuard.startTime ||
              buttonGuard.startTime - solanaTime <= createBigInt(0)) && (
              <>
                <Text fontSize="md" marginRight={"2"}>
                  Ending in:{" "}
                </Text>
                <Timer
                  toTime={buttonGuard.endTime}
                  solanaTime={solanaTime}
                  setCheckEligibility={setCheckEligibility}
                />
              </>
            )}
          {buttonGuard.startTime > createBigInt(0) &&
            buttonGuard.startTime - solanaTime > createBigInt(0) &&
            (!buttonGuard.endTime ||
              solanaTime - buttonGuard.endTime <= createBigInt(0)) && (
              <>
                <Text fontSize="md" marginRight={"2"}>
                  Starting in:{" "}
                </Text>
                <Timer
                  toTime={buttonGuard.startTime}
                  solanaTime={solanaTime}
                  setCheckEligibility={setCheckEligibility}
                />
              </>
            )}
        </Flex>
      </HStack>
      <Flex justifyContent="space-between" margin=".75rem">
        <Box>
          <Text pt="1" fontSize={isSmallerThan650px ? "sm" : "md"}>
            {buttonGuard.mintText}
          </Text>
          <Flex flexDir={"row"}>
            <Text fontSize="sm" mr="5px">
              {buttonGuard.mintLimit.toString() == "UNLIMITED"
                ? buttonGuard.mintLimit
                : buttonGuard.mintLimit + " per wallet "}
            </Text>

            <Text fontSize="sm" fontWeight="500">
              • {buttonGuard.price} SOL per NFT
            </Text>
          </Flex>
        </Box>
        <Tooltip label={buttonGuard.tooltip} aria-label="Mint button">
<Button
            onClick={async () => {
              await mintClick(
                umi,
                buttonGuard,
                candyMachine,
                candyGuard,
                ownedTokens,
                toast,
                mintsCreated,
                setMintsCreated,
                guardList,
                setGuardList,
                onOpen,
                setCheckEligibility
              );
            }}
            key={buttonGuard.label}
            size="sm"
            backgroundColor="#4E46CD"
            textAlign={"center"}
            color="white"
            isDisabled={!buttonGuard.allowed}
            _hover={{
              backgroundColor: "gray",
            }}
            isLoading={
              guardList.find((elem) => elem.label === buttonGuard.label)
                ?.minting
            }
            loadingText={
              guardList.find((elem) => elem.label === buttonGuard.label)
                ?.loadingText
            }
          >
            {buttonGuard.buttonLabel}
          </Button>


        </Tooltip>
      </Flex>
    </Box>
  ));

  return <>{listItems}</>;
}
