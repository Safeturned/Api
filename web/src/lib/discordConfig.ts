export const DISCORD_BOT_CONFIG = {
    clientId: process.env.NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID || '',
    permissions: 85008,
    scopes: ['bot', 'applications.commands'] as const,

    get inviteUrl(): string {
        if (!this.clientId) {
            return '#';
        }
        const params = new URLSearchParams({
            client_id: this.clientId,
            permissions: this.permissions.toString(),
            scope: this.scopes.join(' '),
        });
        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    },

    communityInvite: 'https://discord.gg/JAKWGEabhc',
};

export const BOT_COMMANDS = [
    {
        name: '/analyze',
        translationKey: 'discord.commands.analyze',
        adminOnly: false,
    },
    {
        name: '/private',
        translationKey: 'discord.commands.private',
        adminOnly: false,
    },
    {
        name: '/setup',
        translationKey: 'discord.commands.setup',
        adminOnly: true,
    },
    {
        name: '/help',
        translationKey: 'discord.commands.help',
        adminOnly: false,
    },
    {
        name: '/usage',
        translationKey: 'discord.commands.usage',
        adminOnly: false,
    },
] as const;

export const BOT_PERMISSIONS = [
    {
        nameKey: 'discord.permissions.manageChannels',
        reasonKey: 'discord.permissions.manageChannelsReason',
    },
    {
        nameKey: 'discord.permissions.viewChannels',
        reasonKey: 'discord.permissions.viewChannelsReason',
    },
    {
        nameKey: 'discord.permissions.sendMessages',
        reasonKey: 'discord.permissions.sendMessagesReason',
    },
    {
        nameKey: 'discord.permissions.embedLinks',
        reasonKey: 'discord.permissions.embedLinksReason',
    },
    {
        nameKey: 'discord.permissions.readHistory',
        reasonKey: 'discord.permissions.readHistoryReason',
    },
] as const;
