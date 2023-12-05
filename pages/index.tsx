import { PublicKey, publicKey, Umi } from "@metaplex-foundation/umi";
import ReCaptach   from "../components/ReCaptach";
import {
  DigitalAssetWithToken,
  JsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import {
  Dispatch,
  JSX,
  SetStateAction,
  SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUmi } from "../utils/useUmi";
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  CandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import {
  Center,
  Card,
  CardBody,
  StackDivider,
  Stack,
  useToast,
  Text,
  useDisclosure,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Flex,
  useMediaQuery,
  Progress,
} from "@chakra-ui/react";
import styled from "styled-components";
import Image from "next/image";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText, collectionDescription } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import React from "react";

import ReCAPTCHA from "react-google-recaptcha";

const ButtonListDynamic = dynamic(
  async () => (await import("../components/mintButton")).ButtonList,
  { ssr: false }
);
const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 32px;
  width: 100%;
`;
const InfoRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: 0;
  gap: 16px;
  flex-wrap: wrap;
`;
const InfoBox = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 10px 16px;
  gap: 8px;
  border: 2px solid #ffffff;
  border-radius: 4px;
  font-weight: 600;
  font-size: 20px;
  line-height: 100%;
  text-transform: uppercase;
  color: var(--white);

  @media only screen and (max-width: 450px) {
    font-size: 18px;
  }
`;
const IconRow = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  padding: 0px;
  gap: 24px;
  margin-bottom: -3px;
  margin-left: 1rem;
`;
const CollectionDescription = styled.p`
  font-weight: 400;
  font-size: 20px;
  line-height: 150%;
  margin-bottom: 1rem;
`;
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();

  // useEffect(() => {
  //   (async () => {
  //     if (checkEligibility) {
  //       if (!candyMachineId) {
  //         console.error("No candy machine in .env!");
  //         if (!toast.isActive("no-cm")) {
  //           toast({
  //             id: "no-cm",
  //             title: "No candy machine in .env!",
  //             description: "Add your candy machine address to the .env file!",
  //             status: "error",
  //             duration: 999999,
  //             isClosable: true,
  //           });
  //         }
  //         return;
  //       }

  //       let candyMachine;
  //       try {
  //         candyMachine = await fetchCandyMachine(
  //           umi,
  //           publicKey(candyMachineId)
  //         );
  //       } catch (e) {
  //         console.error(e);
  //         toast({
  //           id: "no-cm-found",
  //           title: "The CM from .env is invalid",
  //           description: "Are you using the correct environment?",
  //           status: "error",
  //           duration: 999999,
  //           isClosable: true,
  //         });
  //       }
  //       setCandyMachine(candyMachine);
  //       if (!candyMachine) {
  //         return;
  //       }
  //       let candyGuard;
  //       try {
  //         candyGuard = await safeFetchCandyGuard(
  //           umi,
  //           candyMachine.mintAuthority
  //         );
  //       } catch (e) {
  //         console.error(e);
  //         toast({
  //           id: "no-guard-found",
  //           title: "No Candy Guard found!",
  //           description: "Do you have one assigned?",
  //           status: "error",
  //           duration: 999999,
  //           isClosable: true,
  //         });
  //       }
  //       if (!candyGuard) {
  //         return;
  //       }
  //       setCandyGuard(candyGuard);
  //       setCheckEligibility(false);
  //     }
  //   })();
  // }, [umi, checkEligibility]);

  return { candyMachine, candyGuard };
};

export interface IsMinting {
  label: string;
  minting: boolean;
}

export default function Home() {
  const [isSmallerThan1100px] = useMediaQuery("(max-width: 1100px)");
  const [isSmallerThan650px] = useMediaQuery("(max-width: 650px)");
  const [isCaptchaVerified, setCaptchaVerified] = useState(false);

  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();
  const {
    isOpen: isShowNftOpen,
    onOpen: onShowNftOpen,
    onClose: onShowNftClose,
  } = useDisclosure();
  const {
    isOpen: isInitializerOpen,
    onOpen: onInitializerOpen,
    onClose: onInitializerClose,
  } = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined
  >();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false },
  ]);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);

  // if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
  //   if (!toast.isActive("no-cm")) {
  //   }
  // }
  // // const candyMachineId: PublicKey = useMemo(() => {
  // //   if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
  // //     return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
  // //   } else {
  // //     console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
  // //     toast({
  // //       id: "no-cm",
  // //       title: "No candy machine in .env!",
  // //       description: "Add your candy machine address to the .env file!",
  // //       status: "error",
  // //       duration: 999999,
  // //       isClosable: true,
  // //     });
  // //     return publicKey("11111111111111111111111111111111");
  // //   }
  // //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // // }, []);
  // const { candyMachine, candyGuard } = useCandyMachine(
  //   umi,
  //   candyMachineId,
  //   checkEligibility,
  //   setCheckEligibility
  // );
  // // the part that makes the component re-render and glitch out
  // useEffect(() => {
  //   const checkEligibility = async () => {
  //     if (candyMachine === undefined || !candyGuard || !checkEligibility) {
  //       return;
  //     }

  //     const { guardReturn, ownedTokens } = await guardChecker(
  //       umi,
  //       candyGuard,
  //       candyMachine,
  //       solanaTime
  //     );

  //     setOwnedTokens(ownedTokens);
  //     setGuards(guardReturn);
  //     setIsAllowed(false);

  //     let allowed = false;
  //     for (const guard of guardReturn) {
  //       if (guard.allowed) {
  //         allowed = true;
  //         break;
  //       }
  //     }

  //     setIsAllowed(allowed);
  //     setLoading(false);
  //   };

  //   checkEligibility();
  // }, [umi, checkEligibility]);

  const PageContent = () => {
    const Globe = (
      props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
    ) => (
      <svg
        width={30}
        height={30}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M15 1.667A20.4 20.4 0 0 1 20.333 15 20.4 20.4 0 0 1 15 28.333m0-26.666A20.4 20.4 0 0 0 9.667 15 20.4 20.4 0 0 0 15 28.333m0-26.666C7.636 1.667 1.667 7.637 1.667 15c0 7.364 5.97 13.333 13.333 13.333m0-26.666c7.364 0 13.333 5.97 13.333 13.333 0 7.364-5.97 13.333-13.333 13.333M2.333 11h25.334M2.333 19h25.334"
          stroke="#fff"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
    const Twitter = (
      props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
    ) => (
      <svg
        width={28}
        height={23}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M8.789 23c-3.235 0-6.25-.94-8.789-2.564 2.155.14 5.958-.195 8.324-2.451-3.559-.163-5.164-2.893-5.373-4.059.302.117 1.744.257 2.558-.07C1.416 12.83.788 9.237.927 8.141c.768.536 2.07.723 2.582.676-3.814-2.729-2.442-6.834-1.767-7.72 2.737 3.792 6.84 5.922 11.914 6.04a5.866 5.866 0 0 1-.146-1.305C13.51 2.61 16.113 0 19.325 0a5.79 5.79 0 0 1 4.25 1.853c1.122-.263 2.81-.878 3.634-1.41-.416 1.493-1.71 2.738-2.493 3.2.006.016-.007-.016 0 0 .688-.104 2.549-.462 3.284-.96-.364.838-1.736 2.233-2.862 3.013C25.348 14.938 18.276 23 8.788 23Z"
          fill="#fff"
        />
      </svg>
    );
    const Discord = (
      props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
    ) => (
      <svg
        width={28}
        height={21}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M24.532 2.66C22.605.98 20.294.14 17.853 0l-.385.42c2.183.56 4.11 1.68 5.908 3.22-2.183-1.26-4.624-2.1-7.193-2.38-.77-.14-1.412-.14-2.183-.14-.77 0-1.413 0-2.184.14-2.568.28-5.009 1.12-7.192 2.38C6.422 2.1 8.349.98 10.532.42L10.147 0c-2.44.14-4.753.98-6.68 2.66C1.285 7.14.129 12.18 0 17.36 1.927 19.6 4.624 21 7.45 21c0 0 .899-1.12 1.54-2.1-1.669-.42-3.21-1.4-4.238-2.94.9.56 1.798 1.12 2.698 1.54 1.155.56 2.311.84 3.467 1.12 1.028.14 2.056.28 3.083.28 1.027 0 2.055-.14 3.083-.28 1.155-.28 2.312-.56 3.468-1.12.899-.42 1.798-.98 2.697-1.54-1.028 1.54-2.57 2.52-4.239 2.94.642.98 1.541 2.1 1.541 2.1 2.826 0 5.523-1.4 7.45-3.64-.128-5.18-1.284-10.22-3.468-14.7ZM9.762 14.84c-1.285 0-2.44-1.26-2.44-2.8 0-1.54 1.155-2.8 2.44-2.8 1.284 0 2.44 1.26 2.44 2.8 0 1.54-1.156 2.8-2.44 2.8Zm8.476 0c-1.284 0-2.44-1.26-2.44-2.8 0-1.54 1.156-2.8 2.44-2.8 1.285 0 2.44 1.26 2.44 2.8 0 1.54-1.155 2.8-2.44 2.8Z"
          fill="#fff"
        />
      </svg>
    );

    return (
      <style jsx global>
      {`
        html {
          height: 100%;
          background: black; /* fallback for old browsers */
        }
        body {
          // background: #673ab7; /* fallback for old browsers */
          background: black; /* fallback for old browsers */
        }
      `}
    </style>

      <>
    
        <Card
          minHeight={isSmallerThan1100px ? "70vh" : "800px"}
          maxWidth="1800px"
          bgColor="black"
          borderRadius="25px"
          boxShadow="rgba(0, 0, 0, 1) 0px 4px 12px"
          padding={isSmallerThan650px ? "0.75rem" : "2.5rem"}
        >
       
            <Center>
              {/* <Button
                backgroundColor={"red.200"}
                marginTop={"10"}
                onClick={onInitializerOpen}
              >
                Initialize Everything!
              </Button> */}
            </Center>
            <Modal isOpen={isInitializerOpen} onClose={onInitializerClose}>
              <ModalOverlay />
              <ModalContent maxW="600px">
                <ModalHeader>Initializer</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <InitializeModal umi={umi} toast={toast} />
                </ModalBody>
              </ModalContent>
            </Modal>
  

         

          <CardBody padding="0">
            <Flex
              gap={isSmallerThan650px ? "20px" : "10px"}
              marginBottom="20px"
              alignItems="center"
              justifyContent="center"
              flexDirection={isSmallerThan1100px ? "column" : "row"}
            >
              <Flex
                width="100%"
                maxWidth="600px"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                color="white"
                // height="45rem"
                maxHeight="100%"
              >
                <Flex>
                  <Content>
                    <Text
                      alignItems="center"
                      justifyContent={
                        isSmallerThan650px ? "center" : "flex-start"
                      }
                      color="white"
                      fontSize={isSmallerThan650px ? "5vh" : "3.5rem"}
                      fontWeight="bold"
                    >
                      {headerText}
                    </Text>
                    <InfoRow>
                      {loading ? (
                        <></>
                      ) : (
                        <InfoBox>
                          <p>Total items</p>
                          <p>{Number}</p>
                        </InfoBox>
                      )}
                      <IconRow>
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          <Globe></Globe>
                        </a>
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          <Twitter></Twitter>
                        </a>
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          <Discord></Discord>
                        </a>
                      </IconRow>
                    </InfoRow>
                    <CollectionDescription>
                      {collectionDescription}
                    </CollectionDescription>
                  </Content>
                </Flex>
                {/* <Text marginBottom="30px" width="100%">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Adipisci laudantium at, error reprehenderit minima
                  repellendus! Eveniet voluptatem iusto repudiandae suscipit,
                  expedita quibusdam quaerat officiis atque at ab libero, labore
                  eaque!
                </Text> */}
                <Flex width="100%" gap="20px">
                  {umi.identity.publicKey ===
                  publicKey("11111111111111111111111111111111") ? (
                    <WalletMultiButtonDynamic
                      style={{
                        display: "flex!important",
                        width: "100%!important",
                      }}
                    />
                  ) : (
                    <Stack
                      divider={<StackDivider />}
                      width="100%"
                      display="flex"
                      rounded={"lg"}
                      pos={"relative"}
                    >
                      {isCaptchaVerified ? (
                        <// guardList={guards}
                        // ownedTokens={ownedTokens}
                        // toast={toast}
                        // setGuardList={setGuards}
                        // onOpen={onShowNftOpen}
                        // setCheckEligibility={setCheckEligibility}
                        ReCaptach
                        />
                      ) : (
                        <ReCAPTCHA
                          sitekey={
                            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
                            " 6Le4rSQpAAAAAMTiGCwY1nAPW0I6cKFrvLSXSsKK "
                          }
                          onChange={(value) => {
                            console.log("Captcha value:", value);
                            setCaptchaVerified(true);
                          }}
                        />
                      )}
                    </Stack>
                  )}
                </Flex>
              </Flex>
              <Flex color="white" flexDirection="column">
                <Image
                  src={image}
                  alt="project Image"
                  layout="responsive"
                  width={100}
                  height={100}
                  style={{
                    minWidth: isSmallerThan650px ? "400px" : "500px",
                    height: "auto",
                  }}
                />
                {loading ||
                umi.identity.publicKey ===
                  publicKey("11111111111111111111111111111111") ? (
                  <div></div>
                ) : (
                  <Flex flexDirection="column" justifyContent="center">
                    <Text
                      alignItems="center"
                      color="white"
                      fontWeight="bold"
                      fontSize="1.5rem"
                      maxWidth="100%"
                      marginLeft="1.25rem"
                      marginRight="1.25rem"
                      mt={5}
                    >
                      Total Minted {Number(candyMachine?.itemsRedeemed)}/
                      {Number(candyMachine?.data.itemsAvailable)}
                    </Text>
                    <Progress
                      colorScheme="purple"
                      marginLeft="1.25rem"
                      marginRight="1.25rem"
                      maxWidth="100%"
                      mt={isSmallerThan650px ? 1 : 3}
                      size="sm"
                      value={
                        (Number(candyMachine?.itemsRedeemed) /
                          Number(candyMachine?.data.itemsAvailable)) *
                        100
                      }
                    />
                  </Flex>
                )}
              </Flex>
            </Flex>
          </CardBody>
        </Card>

        <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
          <ModalOverlay />
          <ModalContent
            backgroundColor="black"
            color="white"
            padding="0.2rem"
            maxW="500px"
            maxH="900px"
            borderRadius="10px"
            justifyContent="center"
          >
            <ModalHeader>Your minted NFT:</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <ShowNft nfts={mintsCreated} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className={styles.wallet} id={styles.headerButton}>
        <WalletMultiButtonDynamic />
      </div>
      <div className={styles.center} style={{ height: "100%" }}>
        <PageContent key="content" />
      </div>
    </main>
  );
}
