import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@metaplex-foundation/umi";
import { Box, Text, Divider, SimpleGrid, VStack } from "@chakra-ui/react";
import React from 'react';

interface TraitProps {
    heading: string;
    description: string;
}

interface TraitsProps {
    metadata: JsonMetadata;
}
const Trait = ({ heading, description }: TraitProps) => {
    return (
        <Box background={"#4E46CD"} borderRadius={"5px"} width={"100%"} minHeight={"100%"} padding="3px" >
            <VStack>
                <Text fontSize={"sm"}>{heading}</Text>
                <Text fontSize={"sm"} marginTop={"-2"} fontWeight={"semibold"}>{description}</Text>
            </VStack>
        </Box>

    );
};

const Traits = ({ metadata }: TraitsProps) => {
    if (metadata === undefined || metadata.attributes === undefined) {
        return <></>
    }
    console.log("traits")


    //find all attributes with trait_type and value
    const traits = metadata.attributes.filter((a) => a.trait_type !== undefined && a.value !== undefined);
    //@ts-ignore
    const traitList = traits.map((t) => <Trait key={t.trait_type} heading={t.trait_type} description={t.value} />);

    return (
        <><Divider marginTop={"15px"} /><SimpleGrid columns={3} marginTop={"15px"} gap={3} >{traitList}</SimpleGrid></>);
};



export default function Card({ metadata }: { metadata: JsonMetadata }) {

    // Get the images from the metadata if animation_url is present use this
    const image = metadata.animation_url ?? metadata.image;
    console.log("image: " + image)
    return (
        <Box
            position={'relative'}
            
            width={'full'}
            overflow={'hidden'}>

            <Box
                key={image}
                height={'sm'}
                position="relative"
                backgroundPosition="center"
                backgroundRepeat="no-repeat"
                backgroundSize="cover"
                backgroundImage={`url(${image})`}
            />
            <Text fontWeight={"semibold"} marginTop={"15px"}>{metadata.name}</Text>
            <Text>{metadata.description}</Text>
            <Traits  metadata={metadata} />
        </Box>
    );
}

type Props = {
    nfts: { mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined;
};

export const ShowNft = ({ nfts }: Props) => {
    if (nfts === undefined) {
        return <></>
    }

    // get the last added nft
    const { mint, offChainMetadata } = nfts[nfts.length - 1];
    if (offChainMetadata === undefined) {
        return <></>
    }
    return (
        <Card  metadata={offChainMetadata} key={mint}  />
    );
}
