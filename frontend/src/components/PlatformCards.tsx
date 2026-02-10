import { useState } from 'react';
import { IconServer, IconChevronRight, IconPencil, IconTrash } from '@tabler/icons-react';
import { observer } from "mobx-react-lite";
import { useDisclosure } from '@mantine/hooks';
import PlatformModal from "../modals/PlatformModal";
import "./PlatformCards.css";
import { platformsStore } from "../behaviour/settings";
import PlatformBuses from './PlatformBuses';

export const PlatformCards = observer(function PlatformCards() {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [opened, { open, close }] = useDisclosure(false);
    const [editValues, setEditValues] = useState<{ id: string; name: string; description: string; host: string } | undefined>(undefined);

    const toggle = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleEdit = (platform: typeof platformsStore.platforms[0]) => {
        setEditValues({
            id: String(platform.id),
            name: platform.name,
            description: platform.description || "",
            host: platform.data?.host || "",
        });
        open();
    };

    if (platformsStore.platforms.length === 0) {
        return (
            <div className="platform-empty">
                No platform configured yet. Add a platform to manage bus connections.
            </div>
        );
    }

    return (
        <>
            <PlatformModal
                opened={opened}
                onClose={close}
                onSubmit={(values) => platformsStore.save(values)}
                initialValues={editValues}
            />
            <div className="platforms-list">
                {platformsStore.platforms.map((platform) => {
                    const buses = platformsStore.platformBuses[platform.id] || [];
                    const isExpanded = expandedId === platform.id;

                    return (
                        <div key={platform.id} className={`platform-card${isExpanded ? ' expanded' : ''}`}>
                            <div className="platform-card-header" onClick={() => toggle(platform.id)}>
                                <div className="platform-card-expand">
                                    <IconChevronRight size={16} />
                                </div>
                                <div className="platform-card-info">
                                    <p className="platform-card-name">
                                        <IconServer size={16} color="var(--mantine-color-blue-filled)" />
                                        {platform.name}
                                    </p>
                                    <p className="platform-card-host">
                                        {platform.data?.host || 'No host configured'}
                                    </p>
                                    {platform.description && (
                                        <p className="platform-card-desc">{platform.description}</p>
                                    )}
                                    <p className="platform-card-stats">
                                        {buses.length} bus{buses.length !== 1 ? 'es' : ''}
                                    </p>
                                </div>
                                <div className="platform-card-actions" onClick={(e) => e.stopPropagation()}>
                                    <button className="platform-card-btn" title="Edit" onClick={() => handleEdit(platform)}>
                                        <IconPencil size={14} />
                                    </button>
                                    <button className="platform-card-btn delete" title="Delete" onClick={() => platformsStore.delete(platform.id)}>
                                        <IconTrash size={14} />
                                    </button>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="platform-buses">
                                    <PlatformBuses platformId={platform.id} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
});

export default PlatformCards;
