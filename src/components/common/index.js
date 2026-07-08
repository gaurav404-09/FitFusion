import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, FlatList, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

function normalizeGradient(gradient) {
    if (Array.isArray(gradient)) {
        const cleaned = gradient.filter((c) => typeof c === 'string' && c.length > 0);
        if (cleaned.length >= 2) return cleaned;
        if (cleaned.length === 1) return [cleaned[0], cleaned[0]];
    }
    if (typeof gradient === 'string' && gradient.length > 0) {
        return [gradient, gradient];
    }
    return Array.isArray(COLORS.gradientCard) ? COLORS.gradientCard : ['#6366F1', '#8B5CF6'];
}

// Premium Gradient Card with stunning gradients
export function GradientCard({ children, gradient, style, onPress }) {
    const content = (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={normalizeGradient(gradient)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientCard, style]}
            >
                {children}
            </LinearGradient>
        </View>
    );
    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
            >
                {content}
            </TouchableOpacity>
        );
    }
    return content;
}

// Premium Stat Card with enhanced styling
export function StatCard({ title, value, unit, icon, color, subtitle, onPress }) {
    const cardColor = color || COLORS.primary;
    return (
        <TouchableOpacity
            activeOpacity={onPress ? 0.7 : 1}
            onPress={() => {
                if (onPress) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }
            }}
            style={[styles.statCard, { borderLeftWidth: 0 }]}
        >
            <LinearGradient
                colors={[cardColor + '08', cardColor + '02']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
            >
                <View style={[styles.statCardAccent, { backgroundColor: cardColor }]} />
                <View style={styles.statCardHeader}>
                    <Text style={[styles.statCardTitle, { color: COLORS.textSecondary }]}>{title}</Text>
                    {!!icon && <Text style={{ fontSize: 20 }}>{icon}</Text>}
                </View>
                <View style={styles.statCardValueRow}>
                    <Text style={[styles.statCardValue, { color: cardColor }]}>{value}</Text>
                    {!!unit && <Text style={styles.statCardUnit}>{unit}</Text>}
                </View>
                {!!subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
            </LinearGradient>
        </TouchableOpacity>
    );
}

// Premium Animated Button with glow effect
export function AnimatedButton({ title, onPress, gradient, style, textStyle, disabled, icon, variant = 'primary' }) {
    const gradients = {
        primary: COLORS.gradientPrimary,
        accent: COLORS.gradientAccent,
        success: COLORS.gradientSuccess,
        violet: COLORS.gradientViolet,
        sky: COLORS.gradientSky,
        calm: COLORS.gradientCalm,
    };

    const selectedGradient = normalizeGradient(gradient || gradients[variant] || COLORS.gradientPrimary);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onPress && onPress();
            }}
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
        >
            <LinearGradient
                colors={selectedGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.animatedButton, style]}
            >
                {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
                <Text style={[styles.buttonText, textStyle]}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

// Premium Header
export function Header({ title, subtitle, onBack, rightAction, onLongPress }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {onBack && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onBack}
                        delayPressIn={0}
                    >
                        <LinearGradient
                            colors={COLORS.gradientPrimary}
                            style={styles.backButtonGradient}
                        >
                            <Text style={styles.backIcon}>←</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
                <View>
                    <Text style={styles.headerTitle}>{title}</Text>
                    {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            {rightAction && rightAction}
        </View>
    );
}

// Premium Input Field
export function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, style }) {
    return (
        <View style={[styles.inputContainer, style]}>
            {label && <Text style={styles.inputLabel}>{label}</Text>}
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[styles.input, multiline && styles.inputMultiline]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );
}

export function StyledInput({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, style, icon }) {
    return (
        <View style={[styles.inputContainer, style]}>
            {label && <Text style={styles.inputLabel}>{label}</Text>}
            <View style={[styles.inputWrapper, styles.styledInputWrapper]}>
                {icon && <Text style={styles.inputIcon}>{icon}</Text>}
                <TextInput
                    style={[styles.input, multiline && styles.inputMultiline, icon && { paddingLeft: 40 }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );
}

// Premium Empty State
export function EmptyState({ icon, title, message, action, actionLabel }) {
    return (
        <View style={styles.emptyState}>
            <LinearGradient
                colors={COLORS.gradientPrimary}
                style={styles.emptyIconGradient}
            >
                <Text style={styles.emptyIcon}>{icon || '📭'}</Text>
            </LinearGradient>
            <Text style={styles.emptyTitle}>{title || 'Nothing here yet'}</Text>
            <Text style={styles.emptyMessage}>{message || 'Start by adding some data'}</Text>
            {action && (
                <AnimatedButton title={actionLabel || 'Get Started'} onPress={action} style={{ marginTop: SPACING.lg }} />
            )}
        </View>
    );
}

// Section Header with premium styling
export function SectionHeader({ title, action, actionLabel }) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionTitleAccent} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {action && (
                <TouchableOpacity onPress={action}>
                    <Text style={styles.sectionAction}>{actionLabel || 'See All'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// Premium Chip / Tag
export function Chip({ label, color, selected, onPress }) {
    const chipColor = color || COLORS.primary;
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.chip,
                selected && {
                    backgroundColor: chipColor,
                    borderColor: chipColor
                },
            ]}
        >
            <Text style={[styles.chipText, selected && { color: COLORS.textInverse }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// Premium Progress Bar
export function ProgressBar({ progress, color, height = 8, style }) {
    const barColor = color || COLORS.primary;
    return (
        <View style={[styles.progressBarBg, { height }, style]}>
            <LinearGradient
                colors={[barColor, barColor + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%`, height }]}
            />
        </View>
    );
}

// Premium Avatar
export function Avatar({ name, color, size = 50 }) {
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const avatarColor = color || COLORS.primary;
    return (
        <LinearGradient
            colors={COLORS.gradientPrimary}
            style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        >
            <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    // Gradient Card
    gradientCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        ...SHADOWS.medium,
    },
    cardContainer: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },

    // Stat Card - Premium
    statCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.small,
        borderWidth: 0,
    },
    statCardGradient: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
    },
    statCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statCardTitle: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.medium,
    },
    statCardValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    statCardValue: {
        fontSize: FONT_SIZES.xxl + 4,
        ...FONTS.bold,
    },
    statCardUnit: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.regular,
        color: COLORS.textMuted,
        marginLeft: SPACING.xs,
    },
    statCardSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },

    // Animated Button - Premium
    animatedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.medium,
        borderWidth: 0,
        minHeight: 52,
    },
    buttonText: {
        color: COLORS.text,
        fontSize: FONT_SIZES.lg,
        ...FONTS.semiBold,
    },
    buttonIcon: {
        fontSize: 18,
        marginRight: SPACING.sm,
    },

    // Header - Premium
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    backButtonGradient: {
        padding: SPACING.sm,
        paddingHorizontal: SPACING.sm,
    },
    backIcon: {
        fontSize: 22,
        color: COLORS.textInverse,
        ...FONTS.bold,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xxl,
        ...FONTS.bold,
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    // Input Fields
    inputContainer: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    inputWrapper: {
        position: 'relative',
    },
    styledInputWrapper: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
    },
    inputIcon: {
        position: 'absolute',
        left: SPACING.md,
        top: 14,
        fontSize: 16,
        zIndex: 1,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md + 2,
        color: COLORS.text,
        fontSize: FONT_SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Empty State - Premium
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.huge,
    },
    emptyIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
    },
    emptyIcon: {
        fontSize: 36,
    },
    emptyTitle: {
        fontSize: FONT_SIZES.xl,
        ...FONTS.bold,
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    emptyMessage: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Section Header - Premium
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitleAccent: {
        width: 4,
        height: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        marginRight: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        ...FONTS.bold,
        color: COLORS.text,
    },
    sectionAction: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        ...FONTS.semiBold,
    },

    // Chip
    chip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.round,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
        backgroundColor: COLORS.surface,
        marginRight: SPACING.sm,
    },
    chipText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        ...FONTS.medium,
    },

    // Progress Bar
    progressBarBg: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: BORDER_RADIUS.round,
        overflow: 'hidden',
    },
    progressBarFill: {
        borderRadius: BORDER_RADIUS.round,
    },

    // Avatar - Premium
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    avatarText: {
        color: COLORS.textInverse,
        ...FONTS.bold,
    },

    // Scroll Picker
    scrollPickerContainer: {
        marginVertical: SPACING.md,
        width: '100%',
    },
    scrollPickerLabel: {
        fontSize: FONT_SIZES.sm,
        ...FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    scrollPickerFrame: {
        flex: 1,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight,
        overflow: 'hidden',
    },
    scrollPickerSelection: {
        position: 'absolute',
        top: '50%', // Center it vertically in the 5-item window
        marginTop: -20, // Half of height (40px) to center perfectly
        height: 40,
        width: '100%',
        backgroundColor: COLORS.primary + '12',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.primary + '25',
    },
    scrollPickerItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollPickerText: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.textMuted,
        ...FONTS.medium,
    },
    scrollPickerTextActive: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.primary,
        ...FONTS.bold,
    },
});

// Scroll Picker for numeric values
export function ScrollPicker({ data, value, onValueChange, label, height = 150 }) {
    const itemHeight = 40;
    const padding = (height - itemHeight) / 2;
    const flatListRef = useRef(null);

    useEffect(() => {
        const index = data.indexOf(value);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
        }
    }, [data, value]);

    const computeSelectedIndex = (y) => {
        // For 5 visible items, select the 3rd one (middle)
        const firstVisibleIndex = Math.floor(y / itemHeight);
        const selectedIndex = firstVisibleIndex + 2;
        return Math.max(0, Math.min(data.length - 1, selectedIndex));
    };

    const onMomentumScrollEnd = (event) => {
        const y = event.nativeEvent.contentOffset.y;
        const selectedIndex = computeSelectedIndex(y);
        if (data[selectedIndex] !== undefined && data[selectedIndex] !== value) {
            onValueChange(data[selectedIndex]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const onScrollEndDrag = (event) => {
        const y = event.nativeEvent.contentOffset.y;
        const selectedIndex = computeSelectedIndex(y);
        if (data[selectedIndex] !== undefined && data[selectedIndex] !== value) {
            onValueChange(data[selectedIndex]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    return (
        <View style={[styles.scrollPickerContainer, { height }]}>
            {label && <Text style={styles.scrollPickerLabel}>{label}</Text>}
            <View style={styles.scrollPickerFrame}>
                <FlatList
                    ref={flatListRef}
                    data={data}
                    keyExtractor={(item) => item + ""}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={itemHeight}
                    decelerationRate="fast"
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    onScrollEndDrag={onScrollEndDrag}
                    contentContainerStyle={{ paddingVertical: padding }}
                    getItemLayout={(_, index) => ({
                        length: itemHeight,
                        offset: itemHeight * index,
                        index,
                    })}
                    renderItem={({ item }) => (
                        <View style={[styles.scrollPickerItem, { height: itemHeight }]}>
                            <Text style={[
                                styles.scrollPickerText,
                                item === value && styles.scrollPickerTextActive
                            ]}>
                                {item}
                            </Text>
                        </View>
                    )}
                />
            </View>
        </View>
    );
}

