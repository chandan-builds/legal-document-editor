import { Extension } from '@tiptap/core';
import { defaultSelectionBuilder, yCursorPlugin } from '@tiptap/y-tiptap';

const awarenessStatesToArray = (states: Map<number, Record<string, any>>) => {
    return Array.from(states.entries()).map(([key, value]) => {
        return {
            clientId: key,
            ...value.user,
        };
    });
};

const defaultOnUpdate = () => null;

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        collaborationCursor: {
            updateUser: (attributes: Record<string, any>) => ReturnType;
        };
    }
}

export const CustomCollaborationCursor = Extension.create({
    name: 'collaborationCursor',

    addOptions() {
        return {
            provider: null,
            user: { name: null, color: null },
            render: (user: any) => {
                const cursor = document.createElement('span');
                cursor.classList.add('collaboration-cursor__caret');
                cursor.setAttribute('style', `border-color: ${user.color}`);

                const label = document.createElement('div');
                label.classList.add('collaboration-cursor__label');
                label.setAttribute('style', `background-color: ${user.color}`);

                const labelText = user.collaboratorRole
                    ? `${user.name} (${user.collaboratorRole})`
                    : user.name;

                label.insertBefore(document.createTextNode(labelText), null);
                cursor.insertBefore(label, null);

                return cursor;
            },
            selectionRender: defaultSelectionBuilder,
            onUpdate: defaultOnUpdate,
        };
    },

    addStorage() {
        return { users: [] };
    },

    addCommands() {
        return {
            updateUser: (attributes: any) => () => {
                this.options.user = attributes;
                this.options.provider.awareness.setLocalStateField('user', this.options.user);
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            yCursorPlugin(
                (() => {
                    this.options.provider.awareness.setLocalStateField('user', this.options.user);
                    this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
                    this.options.provider.awareness.on('update', () => {
                        this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
                    });
                    return this.options.provider.awareness;
                })(),
                {
                    cursorBuilder: this.options.render,
                    selectionBuilder: this.options.selectionRender,
                }
            ),
        ];
    },
});
