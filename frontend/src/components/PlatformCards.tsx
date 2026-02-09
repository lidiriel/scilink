import { IconServer } from '@tabler/icons-react';
import { 
    Button,
    Card,
    Container,
    Group,
    SimpleGrid,
    Text,
    Title,
    useMantineTheme,
} from '@mantine/core';

import { observer } from "mobx-react-lite";
import "./PlatformCards.css";
import { platformsStore } from "../behaviour/settings";

export const PlatformCards = observer(function PlatformCards() {
    const theme = useMantineTheme();
    const platform_list =
        platformsStore.platforms.map((plateform) => (
            <Card key={plateform.name} shadow="md" radius="md" className="card" padding="xl">
                <Text fz="lg" fw={500} className="cardTitle" mt="md">
                    <IconServer color={theme.colors.blue[6]}/>{plateform.name}
                </Text>
                <Text fz="sm" c="dimmed" mt="sm">
                    {plateform.description}
                </Text>

                <Group wrap="nowrap" gap={0}>
                    <Button className="button" variant="light">Edit</Button>
                    <Button className="button" variant="light" color="red">Delete</Button>
                </Group>
            </Card>
        )
    )
    return (
        <Container size="lg" py="xl">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
                {platform_list}
            </SimpleGrid>
        </Container>
    );
});

export default PlatformCards;