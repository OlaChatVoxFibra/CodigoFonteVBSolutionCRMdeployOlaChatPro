/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useContext } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import GroupIcon from "@material-ui/icons/Group";
import PermIdentityIcon from '@material-ui/icons/PermIdentity';
import PersonIcon from "@material-ui/icons/Person";
import CreateIcon from '@material-ui/icons/Create';
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import BlockIcon from '@material-ui/icons/Block';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import Avatar from '@material-ui/core/Avatar';
import formatSerializedId from '../../utils/formatSerializedId';
import { i18n } from "../../translate/i18n";
import ModalImageCors from "../ModalImageCors";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";
import {
	Badge,
	CardHeader,
	Switch,
	Tooltip,
	Tabs,
	Tab,
	Box,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	ListItemIcon,
	ListItemSecondaryAction,
	Divider,
	CircularProgress,
	Grid,
	Chip,
	TextField,
	InputAdornment,
	Collapse,
	Dialog,
	DialogContent,
	useMediaQuery
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { ContactForm } from "../ContactForm";
import ContactModal from "../ContactModal";
import { ContactNotes } from "../ContactNotes";
import ImageIcon from '@material-ui/icons/Image';
import VideocamIcon from '@material-ui/icons/Videocam';
import AudiotrackIcon from '@material-ui/icons/Audiotrack';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import LinkIcon from '@material-ui/icons/Link';
import InfoIcon from '@material-ui/icons/Info';
import MessageIcon from '@material-ui/icons/Message';

import { AuthContext } from "../../context/Auth/AuthContext";
import { getBackendUrl } from "../../config";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { toast } from "react-toastify";
import { TagsKanbanContainer } from "../TagsKanbanContainer";
import NewTicketModal from "../NewTicketModal";
import ChatIcon from '@material-ui/icons/Chat';
import { useHistory } from "react-router-dom";
import ShowTicketOpenModal from "../ShowTicketOpenModal";
import GetAppIcon from '@material-ui/icons/GetApp';
import * as XLSX from "xlsx";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
		zIndex: "auto", // Z-index menor que modais mas maior que conteúdo normal
	},
	tabChip: {
		minHeight: 16,
		height: 16,
		fontSize: "0.7rem",
		backgroundColor: theme.palette.primary.main,
		color: theme.palette.primary.contrastText,
		marginLeft: 4,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		flexDirection: "column",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
		height: "100%",
		overflow: "hidden", // Importante para evitar overflow no drawer principal
		[theme.breakpoints.down('sm')]: {
			width: "100%", // No mobile, usar largura total
			borderRadius: 0, // Sem bordas arredondadas no mobile
		},
	},
	header: {
		display: "flex",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: theme.palette.inputBackground,
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "50px",
		justifyContent: "flex-start",
		flexShrink: 0,
		position: "relative",
		zIndex: 1,
	},
	// headerTitle: {
	// 	flexGrow: 1,
	// 	textAlign: "center",
	// 	color: theme.palette.text.primary,
	// 	fontWeight: 600,
	// 	whiteSpace: "nowrap",
	// 	overflow: "hidden",
	// 	textOverflow: "ellipsis",
	// },
	profileSection: {
		flexShrink: 0,
		backgroundColor: theme.palette.inputBackground,
	},
	searchContainer: {
		padding: theme.spacing(1, 2),
		backgroundColor: theme.palette.background.paper,
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		flexShrink: 0,
	},
	searchField: {
		"& .MuiOutlinedInput-root": {
			height: 40,
		}
	},
	searchResults: {
		maxHeight: 200,
		overflow: "auto",
		...theme.scrollbarStyles,
	},
	searchResultItem: {
		padding: theme.spacing(1),
		cursor: "pointer",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
	},
	searchResultText: {
		fontSize: "0.85rem",
		"& mark": {
			backgroundColor: theme.palette.primary.light,
			color: theme.palette.primary.contrastText,
			padding: "0 2px",
			borderRadius: 2,
		}
	},
	searchResultDate: {
		fontSize: "0.75rem",
		color: theme.palette.text.secondary,
		marginTop: 4,
	},
	emptySearchState: {
		textAlign: "center",
		padding: theme.spacing(2),
		color: theme.palette.text.secondary,
		fontSize: "0.85rem",
	},
	tabsContainer: {
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: theme.palette.background.paper,
		flexShrink: 0,
	},
	contentWrapper: {
		display: "flex",
		flexDirection: "column",
		height: "calc(100% - 50px)",
		overflow: "hidden",
	},
	scrollableContent: {
		flex: 1,
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
	},
	tabPanel: {
		flex: 1,
		overflow: "auto",
		padding: theme.spacing(1),
		...theme.scrollbarStyles,
		// Garantir que cada tab panel tenha rolagem independente
		height: "100%",
		maxHeight: "100%",
	},
	// Avatar redondo e menor
	contactAvatar: {
		width: 80,
		height: 80,
		borderRadius: "50%",
		margin: theme.spacing(1),
		border: `2px solid ${theme.palette.primary.main}`,
		cursor: "pointer", // Adicionar cursor pointer
		"&:hover": {
			opacity: 0.8,
		},
	},
	contactHeader: {
		display: "flex",
		padding: theme.spacing(1),
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: theme.spacing(0.5),
		},
	},
	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
	switchContainer: {
		padding: theme.spacing(1, 2),
		backgroundColor: theme.palette.background.paper,
		marginBottom: theme.spacing(1),
		flexShrink: 0,
	},
	mediaGrid: {
		padding: theme.spacing(1),
	},
	mediaItem: {
		cursor: "pointer",
		transition: "transform 0.2s",
		"&:hover": {
			transform: "scale(1.05)",
		},
		borderRadius: theme.spacing(1),
		overflow: "hidden",
		height: 100,
		backgroundColor: theme.palette.action.hover,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	mediaThumbnail: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
	mediaIcon: {
		fontSize: 40,
		color: theme.palette.text.secondary,
	},
	loadingContainer: {
		display: "flex",
		justifyContent: "center",
		padding: theme.spacing(3),
	},
	emptyState: {
		textAlign: "center",
		padding: theme.spacing(3),
		color: theme.palette.text.secondary,
	},
	linkItem: {
		padding: theme.spacing(1),
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		borderRadius: theme.spacing(0.5),
		marginBottom: theme.spacing(0.5),
	},
	// Novos estilos para os ícones de ação
	contactActions: {
		display: "flex",
		flexDirection: "row",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1),
		justifyContent: "center",
	},
	actionIcon: {
		backgroundColor: theme.palette.background.paper,
		border: `1px solid ${theme.palette.divider}`,
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	editIcon: {
		color: theme.palette.primary.main,
	},
	blockIcon: {
		color: theme.palette.error.main,
	},
	unblockIcon: {
		color: theme.palette.success.main,
	},
	tabIcon: {
		minHeight: 48,
		minWidth: 'auto',
		padding: theme.spacing(0.5, 1),
	},
	// Garantir que o CardHeader não cause overflow
	contactCardHeader: {
		width: '100%',
		padding: theme.spacing(1),
	},
	participantsList: {
		padding: 0,
	},
	participantItem: {
		paddingLeft: theme.spacing(1),
		paddingRight: theme.spacing(1),
		marginBottom: theme.spacing(0.5),
		borderRadius: theme.spacing(1),
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	participantAvatar: {
		width: 45,
		height: 45,
	},
	adminIcon: {
		color: theme.palette.warning.main,
		fontSize: 16,
		backgroundColor: theme.palette.background.paper,
		borderRadius: "50%",
		padding: 2,
	},
	superAdminIcon: {
		color: theme.palette.error.main,
		fontSize: 16,
		backgroundColor: theme.palette.background.paper,
		borderRadius: "50%",
		padding: 2,
	},
	adminChip: {
		backgroundColor: theme.palette.warning.light,
		color: theme.palette.warning.contrastText,
		fontSize: "0.7rem",
	},
	superAdminChip: {
		backgroundColor: theme.palette.error.light,
		color: theme.palette.error.contrastText,
		fontSize: "0.7rem",
	},
	// Estilos para o modal da imagem
	imageModal: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	imageModalContent: {
		outline: "none",
		maxWidth: "90vw",
		maxHeight: "90vh",
	},
	expandedImage: {
		width: "100%",
		height: "auto",
		maxWidth: "500px",
		borderRadius: theme.spacing(1),
	},
	exportButton: {
		marginLeft: theme.spacing(2),
		textTransform: "none",
	},
	exportButtonContainer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: theme.spacing(2),
	}
}));

function TabPanel(props) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`contact-tabpanel-${index}`}
			aria-labelledby={`contact-tab-${index}`}
			style={{
				height: "100%",
				display: value === index ? "flex" : "none",
				flexDirection: "column",
				overflow: "hidden"
			}}
			{...other}
		>
			{value === index && (
				<div className={props.classes?.tabPanel} style={{ flex: 1, overflow: "auto" }}>
					{children}
				</div>
			)}
		</div>
	);
}

const ContactDrawer = ({ open, handleDrawerClose, contact, ticket, loading }) => {
	const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const history = useHistory();

	const [modalOpen, setModalOpen] = useState(false);
	const [blockingContact, setBlockingContact] = useState(contact.active);
	const [openForm, setOpenForm] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const [mediaData, setMediaData] = useState({ images: [], videos: [], audios: [], documents: [], links: [] });
	const [loadingMedia, setLoadingMedia] = useState(false);
	const { get } = useCompanySettings();
	const [hideNum, setHideNum] = useState(false);
	const { user } = useContext(AuthContext);
	const [acceptAudioMessage, setAcceptAudio] = useState(contact.acceptAudioMessage);
	const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem
	const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
	const [participantInitialContact, setParticipantInitialContact] = useState(undefined);
	const [openTicketAlert, setOpenTicketAlert] = useState(false);
	const [openTicketInfo, setOpenTicketInfo] = useState({ user: "", queue: "" });


	const [participants, setParticipants] = useState([]);
	const [loadingParticipants, setLoadingParticipants] = useState(false);


	// Estados para pesquisa
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [searchTimeout, setSearchTimeout] = useState(null);

	// Função para buscar participantes do grupo
	const fetchGroupParticipants = async () => {
		if (!contact.isGroup) return;

		setLoadingParticipants(true);
		try {
			const { data } = await api.get(`/contacts/${contact.id}/participants`);
			setParticipants(data);
		} catch (err) {
			console.error("Erro ao buscar participantes do grupo:", err);
			toastError("Erro ao carregar participantes do grupo");
			setParticipants([]);
		} finally {
			setLoadingParticipants(false);
		}
	};

	useEffect(() => {
		let cancelled = false;
		async function fetchData() {
			try {
				const lgpdHideNumber = await get({
					column: "lgpdHideNumber"
				});
				if (cancelled) return;
				if (lgpdHideNumber === "enabled") setHideNum(true);
			} catch (err) {
				if (!cancelled) toastError(err);
			}
		}
		fetchData();
		return () => {
			cancelled = true;
		};
		// get do hook não é memoizado
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setAcceptAudio(contact.acceptAudioMessage);
		setOpenForm(false);
		setTabValue(0);
		// Limpar pesquisa ao trocar de contato
		setSearchTerm("");
		setSearchResults([]);
		setShowSearchResults(false);
		setParticipants([]); // Limpar participantes

		if (open && contact.id) {
			fetchMediaData();
			// Buscar participantes apenas se for um grupo
			if (contact.isGroup) {
				fetchGroupParticipants();
			}
		}
	}, [open, contact]);

	// Função para abrir modal da imagem
	const handleImageClick = () => {
		if (contact?.urlPicture) {
			setImageModalOpen(true);
		}
	};

	// Função para fechar modal da imagem
	const handleImageModalClose = () => {
		setImageModalOpen(false);
	};

	// Função para buscar mensagens
	const searchMessages = async (searchParam) => {
		if (!searchParam || searchParam.trim().length < 2) {
			setSearchResults([]);
			setShowSearchResults(false);
			return;
		}

		setSearchLoading(true);
		try {
			const { data } = await api.get(`/contacts/${contact.id}/messages/search`, {
				params: { searchParam: searchParam.trim() }
			});

			setSearchResults(data.messages || []);
			setShowSearchResults(true);
		} catch (err) {
			console.error("Erro ao buscar mensagens:", err);
			toastError(err);
			setSearchResults([]);
		} finally {
			setSearchLoading(false);
		}
	};

	// Handler para mudança no campo de pesquisa com debounce
	const handleSearchChange = (event) => {
		const value = event.target.value;
		setSearchTerm(value);

		// Clear timeout anterior
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Definir novo timeout para debounce
		const newTimeout = setTimeout(() => {
			searchMessages(value);
		}, 500);

		setSearchTimeout(newTimeout);
	};

	// Limpar pesquisa
	const clearSearch = () => {
		setSearchTerm("");
		setSearchResults([]);
		setShowSearchResults(false);
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	};

	// Destacar texto na pesquisa
	const highlightSearchTerm = (text) => {
		if (!searchTerm || !text) return text;

		const regex = new RegExp(`(${searchTerm})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	};

	// Navegar para mensagem (placeholder - implementar conforme necessário)
	const handleGoToMessage = (message) => {
		// Aqui você pode implementar a navegação para a mensagem específica
		console.log("Navegar para mensagem:", message);
		toast.info(`Mensagem encontrada: ${message.body.substring(0, 50)}...`);
		setShowSearchResults(false);
	};

	const fetchMediaData = async () => {
		setLoadingMedia(true);
		try {
			const { data } = await api.get(`/contacts/${contact.id}/media`);
			// Garantir que as URLs das mídias estejam corretas
			const processedData = {
				images: data.images.map(item => ({
					...item,
					mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
						? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
						: item.mediaUrl
				})),
				videos: data.videos.map(item => ({
					...item,
					mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
						? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
						: item.mediaUrl
				})),
				audios: data.audios.map(item => ({
					...item,
					mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
						? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
						: item.mediaUrl
				})),
				documents: data.documents.map(item => ({
					...item,
					mediaUrl: item.mediaUrl && !item.mediaUrl.startsWith('http')
						? `${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`
						: item.mediaUrl
				})),
				links: data.links
			};
			setMediaData(processedData);
		} catch (err) {
			console.error('Erro ao buscar mídias do contato:', {
				status: err?.response?.status,
				url: err?.config?.url,
				message: err?.message
			});
			toastError(err);
			setMediaData({
				images: [],
				videos: [],
				audios: [],
				documents: [],
				links: []
			});
		} finally {
			setLoadingMedia(false);
		}
	};

	const renderParticipants = () => {
		if (loadingParticipants) {
			return (
				<div className={classes.loadingContainer}>
					<CircularProgress size={40} />
				</div>
			);
		}

		if (participants.length === 0) {
			return (
				<div className={classes.emptyState}>
					<Typography variant="body2">
						Nenhum participante encontrado
					</Typography>
				</div>
			);
		}

		return (
			<List className={classes.participantsList}>
				{participants.map((participant) => (
					<ListItem key={participant.id} className={classes.participantItem} button onClick={() => handleOpenChatWithParticipant(participant)}>
						<ListItemAvatar>
							<Badge
								overlap="circular"
								anchorOrigin={{
									vertical: 'bottom',
									horizontal: 'right',
								}}
								badgeContent={
									participant.isSuperAdmin ? (
										<PermIdentityIcon className={classes.superAdminIcon} />
									) : participant.isAdmin ? (
										<PermIdentityIcon className={classes.adminIcon} />
									) : null
								}
							>
								<Avatar
									src={participant.profilePicUrl}
									alt={participant.name}
									className={classes.participantAvatar}
								>
									{participant.name?.charAt(0)?.toUpperCase()}
								</Avatar>
							</Badge>
						</ListItemAvatar>
						<ListItemText
							primary={
								<Typography variant="subtitle2" noWrap>
									{participant.name}
								</Typography>
							}
							secondary={
								<Typography variant="caption" color="textSecondary" noWrap>
									{formatSerializedId(participant.number)}
								</Typography>
							}
						/>
						<ListItemSecondaryAction>
							<IconButton edge="end" size="small" aria-label="Conversar" onClick={(e) => { e.stopPropagation(); handleOpenChatWithParticipant(participant); }}>
								<ChatIcon />
							</IconButton>
							{participant.isSuperAdmin && (
								<Chip
									size="small"
									label="Super Admin"
									className={classes.superAdminChip}
									icon={<PermIdentityIcon />}
								/>
							)}
							{participant.isAdmin && !participant.isSuperAdmin && (
								<Chip
									size="small"
									label="Admin"
									className={classes.adminChip}
									icon={<PersonIcon />}
								/>
							)}
						</ListItemSecondaryAction>
					</ListItem>
				))}
			</List>
		);
	};

	// Abrir modal de conversa com participante
	const handleOpenChatWithParticipant = async (participant) => {
		try {
			// Buscar contato pelo número; se não existir, criar
			const profile = await api.get(`/contacts/profile/${participant.number}`);
			let contactId = profile?.data?.contactId || 0;
			if (!contactId || contactId === 0) {
				const createResp = await api.post('/contacts', { name: participant.name || participant.number, number: participant.number });
				contactId = createResp?.data?.id;
			}

			if (contactId) {
				// Verificar se já existe ticket aberto para este contato
				try {
					// Buscar todos os tickets abertos (open, pending, chatbot)
					const ticketsResponse = await api.get('/tickets', {
						params: {
							pageNumber: "1"
						}
					});

					// Procurar ticket existente para este contato
					const existingTicket = ticketsResponse.data?.tickets?.find(
						ticket => ticket.contactId === contactId && 
							["open", "pending", "chatbot"].includes(ticket.status)
					);

					if (existingTicket) {
						// Ticket já existe - verificar se pertence a outro usuário
						if (existingTicket.userId !== user.id) {
							setOpenTicketInfo({
								user: existingTicket.user?.name || "Outro usuário",
								queue: existingTicket.queue?.name || "Sem fila"
							});
							setOpenTicketAlert(true);
							return;
						} else {
							// Ticket existe e pertence ao próprio usuário
							// Navegar para o ticket existente
							handleTicketCreated(existingTicket);
							return;
						}
					}
				} catch (checkError) {
					console.error('Erro ao verificar tickets existentes:', checkError);
					toastError('Erro ao verificar tickets existentes');
					return;
				}

				// Se chegou aqui, pode abrir o modal para criar ticket
				setParticipantInitialContact({ id: contactId, name: participant.name, number: participant.number });
				setNewTicketModalOpen(true);
			}
		} catch (err) {
			console.error('Erro ao abrir conversa com participante:', err);
			toastError('Não foi possível iniciar a conversa com este participante');
		}
	};

	// Handler para quando o ticket for criado
  const handleTicketCreated = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket && (ticket.uuid || ticket.id)) {
      const target = ticket.uuid ? `/tickets/${ticket.uuid}` : `/tickets/${ticket.id}`;
      history.push(target);
    }
  };

	// Função para exportar participantes para Excel
	const handleExportParticipants = () => {
		if (participants.length === 0) {
			toast.error("Não há participantes para exportar");
			return;
		}

		try {
			// Preparar dados para exportação
			const exportData = participants.map((participant, index) => ({
				"#": index + 1,
				"Nome": participant.name || "Sem nome",
				"Número": formatSerializedId(participant.number),
				"Role": participant.isSuperAdmin 
					? "Super Admin" 
					: participant.isAdmin 
					? "Admin" 
					: "Participante"
			}));

			// Criar workbook e worksheet
			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.json_to_sheet(exportData);

			// Ajustar largura das colunas
			const colWidths = [
				{ wch: 5 },  // #
				{ wch: 30 }, // Nome
				{ wch: 20 }, // Número
				{ wch: 15 }  // Role
			];
			ws['!cols'] = colWidths;

			// Adicionar worksheet ao workbook
			XLSX.utils.book_append_sheet(wb, ws, "Participantes");

			// Gerar nome do arquivo com o nome do grupo e data
			const groupName = contact.name || "Grupo";
			const fileName = `Participantes_${groupName}_${new Date().toISOString().split('T')[0]}.xlsx`;

			// Fazer download do arquivo
			XLSX.writeFile(wb, fileName);

			toast.success(`Arquivo "${fileName}" exportado com sucesso!`);
		} catch (err) {
			console.error("Erro ao exportar participantes:", err);
			toastError("Erro ao exportar participantes");
		}
	};

	const handleContactToggleAcceptAudio = async () => {
		try {
			const contact = await api.put(`/contacts/toggleAcceptAudio/${ticket.contact.id}`);
			setAcceptAudio(contact.data.acceptAudioMessage);
		} catch (err) {
			toastError(err);
		}
	};

	const handleBlockContact = async (contactId) => {
		try {
			await api.put(`/contacts/block/${contactId}`, { active: false });
			toast.success("Contato bloqueado");
		} catch (err) {
			toastError(err);
		}
		setBlockingContact(true);
	};

	const handleUnBlockContact = async (contactId) => {
		try {
			await api.put(`/contacts/block/${contactId}`, { active: true });
			toast.success("Contato desbloqueado");
		} catch (err) {
			toastError(err);
		}
		setBlockingContact(false);
	};

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
		// Limpar pesquisa ao trocar de aba
		if (newValue !== 0) {
			clearSearch();
		}
	};

	const renderSearchResults = () => {
		if (searchLoading) {
			return (
				<div className={classes.emptySearchState}>
					<CircularProgress size={20} />
					<Typography variant="caption" style={{ marginLeft: 8 }}>
						Buscando...
					</Typography>
				</div>
			);
		}

		if (searchResults.length === 0 && searchTerm.length >= 2) {
			return (
				<div className={classes.emptySearchState}>
					<Typography variant="caption">
						Nenhuma mensagem encontrada
					</Typography>
				</div>
			);
		}

		return (
			<div className={classes.searchResults}>
				{searchResults.map((message, index) => (
					<div
						key={message.id}
						className={classes.searchResultItem}
						onClick={() => handleGoToMessage(message)}
					>
						<Typography
							className={classes.searchResultText}
							dangerouslySetInnerHTML={{
								__html: highlightSearchTerm(message.body.substring(0, 100) + (message.body.length > 100 ? "..." : ""))
							}}
						/>
						<Typography className={classes.searchResultDate}>
							{new Date(message.createdAt).toLocaleString('pt-BR')}
							{message.fromMe ? " (Você)" : ` (${contact.name})`}
						</Typography>
					</div>
				))}
			</div>
		);
	};

	const renderMediaContent = () => {
		if (loadingMedia) {
			return (
				<div className={classes.loadingContainer}>
					<CircularProgress />
				</div>
			);
		}

		const renderMediaGrid = (items, type) => {
			if (items.length === 0) {
				return (
					<div className={classes.emptyState}>
						<Typography variant="body2">
							{type === "images" && "Nenhuma imagem encontrada"}
							{type === "videos" && "Nenhum vídeo encontrado"}
							{type === "audios" && "Nenhum áudio encontrado"}
						</Typography>
					</div>
				);
			}

			return (
				<Grid container spacing={1} className={classes.mediaGrid}>
					{items.map((item, index) => (
						<Grid item xs={4} key={index}>
							<Paper
								className={classes.mediaItem}
								elevation={1}
								onClick={() => {
									if (type === "images" || type === "videos" || type === "audios") {
										window.open(item.mediaUrl, '_blank');
									}
								}}
							>
								{type === "images" && (
									<img
										src={item.mediaUrl}
										alt=""
										className={classes.mediaThumbnail}
									/>
								)}
								{type === "videos" && (
									<Box display="flex" flexDirection="column" alignItems="center">
										<VideocamIcon className={classes.mediaIcon} />
										<Typography variant="caption" style={{ marginTop: 4 }}>
											{new Date(item.createdAt).toLocaleDateString('pt-BR')}
										</Typography>
									</Box>
								)}
								{type === "audios" && (
									<Box display="flex" flexDirection="column" alignItems="center">
										<AudiotrackIcon className={classes.mediaIcon} />
										<Typography variant="caption" style={{ marginTop: 4 }}>
											{new Date(item.createdAt).toLocaleDateString('pt-BR')}
										</Typography>
									</Box>
								)}
							</Paper>
						</Grid>
					))}
				</Grid>
			);
		};

		const renderDocuments = () => {
			if (mediaData.documents.length === 0) {
				return (
					<div className={classes.emptyState}>
						<Typography variant="body2">Nenhum documento encontrado</Typography>
					</div>
				);
			}

			return (
				<List>
					{mediaData.documents.map((doc, index) => (
						<ListItem
							key={index}
							button
							className={classes.linkItem}
							onClick={() => window.open(doc.mediaUrl, '_blank')}
						>
							<ListItemIcon>
								<InsertDriveFileIcon />
							</ListItemIcon>
							<ListItemText
								primary={doc.body || `Documento ${index + 1}`}
								secondary={new Date(doc.createdAt).toLocaleDateString('pt-BR')}
							/>
						</ListItem>
					))}
				</List>
			);
		};

		const renderLinks = () => {
			if (mediaData.links.length === 0) {
				return (
					<div className={classes.emptyState}>
						<Typography variant="body2">Nenhum link encontrado</Typography>
					</div>
				);
			}

			return (
				<List>
					{mediaData.links.map((link, index) => (
						<ListItem
							key={index}
							button
							className={classes.linkItem}
							onClick={() => window.open(link.url, '_blank')}
						>
							<ListItemIcon>
								<LinkIcon />
							</ListItemIcon>
							<ListItemText
								primary={link.title || link.url}
								secondary={new Date(link.createdAt).toLocaleDateString('pt-BR')}
							/>
						</ListItem>
					))}
				</List>
			);
		};

		return (
			<>
				<TabPanel value={tabValue} index={1} classes={classes}>
					{renderMediaGrid(mediaData.images, "images")}
				</TabPanel>
				<TabPanel value={tabValue} index={2} classes={classes}>
					{renderMediaGrid(mediaData.videos, "videos")}
				</TabPanel>
				<TabPanel value={tabValue} index={3} classes={classes}>
					{renderMediaGrid(mediaData.audios, "audios")}
				</TabPanel>
				<TabPanel value={tabValue} index={4} classes={classes}>
					{renderDocuments()}
				</TabPanel>
			<TabPanel value={tabValue} index={5} classes={classes}>
				{renderLinks()}
			</TabPanel>

		</>
		);
	};

	if (loading) return null;

	return (
		<>
		{newTicketModalOpen && (
			<NewTicketModal
				modalOpen={newTicketModalOpen}
				onClose={handleTicketCreated}
				initialContact={participantInitialContact || undefined}
			/>
		)}
		<ShowTicketOpenModal
			isOpen={openTicketAlert}
			handleClose={() => setOpenTicketAlert(false)}
			user={openTicketInfo.user}
			queue={openTicketInfo.queue}
		/>
			<Drawer
				className={classes.drawer}
				variant={isMobile ? "temporary" : "persistent"}
				// variant="persistent"
				anchor="right"
				open={open}
				onClose={isMobile ? handleDrawerClose : undefined}
				PaperProps={{ 
					style: isMobile ? {
						width: "100vw",
						maxWidth: "400px",
						height: "100vh",
						position: "fixed",
						top: 0,
						right: 0,
						zIndex: 9999,
						backgroundColor: theme.palette.background.paper
					} : { 
						position: "absolute", 
						right: 0, 
						top: 0, 
						height: "100%",
						width: drawerWidth,
						zIndex: 1200
					} 
				}}
				ModalProps={isMobile ? {
					style: { position: "fixed", zIndex: 9999 }
				} : {
					container: document.getElementById("drawer-container"),
					style: { position: "relative", zIndex: 1200 },
				}}
				classes={{
					paper: classes.drawerPaper,
				}}
			>
				<div className={classes.header}>
					<IconButton onClick={handleDrawerClose}>
						<CloseIcon />
					</IconButton>
					{/* <Typography className={classes.headerTitle} variant="subtitle1"> */}
					<Typography style={{ justifySelf: "center" }}>
						{i18n.t("contactDrawer.header")}
					</Typography>
				</div>

				<div className={classes.contentWrapper}>
					{/* Seção de Switch */}
					<Box className={classes.switchContainer}>
						<Typography
							style={{ marginBottom: 0 }}
							variant="subtitle2"
						>
							<Switch
								size="small"
								checked={acceptAudioMessage}
								onChange={() => handleContactToggleAcceptAudio()}
								name="disableBot"
								color="primary"
							/>
							{i18n.t("ticketOptionsMenu.acceptAudioMessage")}
						</Typography>
					</Box>

					{/* Seção do Perfil */}
					<div className={classes.profileSection}>
						<Paper square variant="outlined" className={classes.contactHeader}>
							{/* Avatar redondo e menor - CLICÁVEL */}
					<Avatar
								src={(function(){const u=(contact?.urlPicture||contact?.profilePicUrl)||"";const b=(getBackendUrl&&getBackendUrl());if(!u)return "";if(/^(data:|blob:|https?:\/\/)/i.test(u))return u;return u.startsWith("/")?`${b}${u}`:`${b}/public/${u}`;})()}
								alt={contact.name}
								className={classes.contactAvatar}
								onClick={handleImageClick}
								onError={(e)=>{e.target.onerror=null;e.target.src=((getBackendUrl&&getBackendUrl()))+"/public/app/noimage.png";}}
							>
								{contact.name?.charAt(0)?.toUpperCase()}
							</Avatar>

							<div className={classes.contactCardHeader}>
								{/* Nome completo */}
								<Typography variant="h6" align="center" style={{ marginBottom: 8 }}>
									{contact.name}
								</Typography>

								{/* Número do WhatsApp */}
								<Typography
									style={{
										fontSize: 12,
										textAlign: "center",
										marginBottom: 4,
										// Destacar em vermelho se número parece ser um LID
										color: contact.number && contact.number.includes('@') ? '#f44336' : 'inherit'
									}}
								>
									{contact.number && contact.number.includes('@') && (
										<span style={{ fontSize: 10, color: '#f44336', display: 'block' }}>
											⚠️ Possível erro: Número parece ser LID
										</span>
									)}
									{hideNum && user.profile === "user"
										? formatSerializedId(contact.number).slice(0, -6) + "**-**" + contact.number.slice(-2)
										: formatSerializedId(contact.number)}
								</Typography>

								{/* LID */}
								<Typography style={{ fontSize: 12, textAlign: "center", marginBottom: 4 }}>
									LID: {contact.lid || ""}
								</Typography>

								{/* Email */}
								{contact.email && (
									<Typography style={{ color: "primary", fontSize: 12 }} align="center">
										<Link href={`mailto:${contact.email}`}>{contact.email}</Link>
									</Typography>
								)}
							</div>

							{/* Ícones de ação com tooltips */}
							<div className={classes.contactActions}>
								<Tooltip title={i18n.t("contactDrawer.buttons.edit")} arrow>
									<IconButton
										className={`${classes.actionIcon} ${classes.editIcon}`}
										onClick={() => setModalOpen(!openForm)}
										size="small"
									>
										<CreateIcon />
									</IconButton>
								</Tooltip>

								<Tooltip
									title={!contact.active ? "Desbloquear contato" : "Bloquear contato"}
									arrow
								>
									<IconButton
										className={`${classes.actionIcon} ${!contact.active ? classes.unblockIcon : classes.blockIcon}`}
										onClick={() => contact.active
											? handleBlockContact(contact.id)
											: handleUnBlockContact(contact.id)}
										disabled={loading}
										size="small"
									>
										{!contact.active ? <LockOpenIcon /> : <BlockIcon />}
									</IconButton>
								</Tooltip>
							</div>

							{(contact.id && openForm) && <ContactForm initialContact={contact} onCancel={() => setOpenForm(false)} />}
						</Paper>
					</div>

					{/* Campo de Pesquisa */}
					<Box className={classes.searchContainer}>
						<TextField
							className={classes.searchField}
							fullWidth
							size="small"
							variant="outlined"
							placeholder="Pesquisar nas mensagens..."
							value={searchTerm}
							onChange={handleSearchChange}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon fontSize="small" />
									</InputAdornment>
								),
								endAdornment: searchTerm && (
									<InputAdornment position="end">
										<IconButton
											size="small"
											onClick={clearSearch}
											edge="end"
										>
											<ClearIcon fontSize="small" />
										</IconButton>
									</InputAdornment>
								),
							}}
						/>

						{/* Resultados da Pesquisa */}
						<Collapse in={showSearchResults}>
							<Paper variant="outlined" style={{ marginTop: 8 }}>
								{renderSearchResults()}
							</Paper>
						</Collapse>
					</Box>

					{/* Abas com Ícones */}
					<Tabs
						value={tabValue}
						onChange={handleTabChange}
						variant="scrollable"
						scrollButtons="auto"
						className={classes.tabsContainer}
					>
						<Tab
							className={classes.tabIcon}
							icon={<InfoIcon />}
							aria-label="Informações"
						/>
						<Tab
							className={classes.tabIcon}
							icon={
								<Box display="flex" alignItems="center">
									<ImageIcon />
									{mediaData.images.length > 0 && (
										<Chip size="small" label={mediaData.images.length} className={classes.tabChip} />
									)}
								</Box>
							}
							aria-label="Imagens"
						/>
						<Tab
							className={classes.tabIcon}
							icon={
								<Box display="flex" alignItems="center">
									<VideocamIcon />
									{mediaData.videos.length > 0 && (
										<Chip size="small" label={mediaData.videos.length} className={classes.tabChip} />
									)}
								</Box>
							}
							aria-label="Vídeos"
						/>
						<Tab
							className={classes.tabIcon}
							icon={
								<Box display="flex" alignItems="center">
									<AudiotrackIcon />
									{mediaData.audios.length > 0 && (
										<Chip size="small" label={mediaData.audios.length} className={classes.tabChip} />
									)}
								</Box>
							}
							aria-label="Áudios"
						/>
						<Tab
							className={classes.tabIcon}
							icon={
								<Box display="flex" alignItems="center">
									<InsertDriveFileIcon />
									{mediaData.documents.length > 0 && (
										<Chip size="small" label={mediaData.documents.length} className={classes.tabChip} />
									)}
								</Box>
							}
							aria-label="Documentos"


						/>
						<Tab
							className={classes.tabIcon}
							icon={
								<Box display="flex" alignItems="center">
									<LinkIcon />
									{mediaData.links.length > 0 && (
										<Chip size="small" label={mediaData.links.length} className={classes.tabChip} />
									)}
								</Box>
							}
							aria-label="Links"
						/>
						{contact.isGroup && (
							<Tab
								className={classes.tabIcon}
								icon={
									<Box display="flex" alignItems="center">
										<GroupIcon />
										{participants.length > 0 && (
											<Chip size="small" label={participants.length} className={classes.tabChip} />
										)}
									</Box>
								}
								aria-label="Participantes"
							/>
						)}
					</Tabs>

					{/* Conteúdo Rolável */}
					{/* Conteúdo Rolável */}
					<div className={classes.scrollableContent}>
						{loading ? (
							<ContactDrawerSkeleton classes={classes} />
						) : (
							<>
								<TabPanel value={tabValue} index={0} classes={classes}>
									<TagsKanbanContainer ticket={ticket} className={classes.contactTags} />

									<Paper square variant="outlined" className={classes.contactDetails}>
										<Typography variant="subtitle1" style={{ marginBottom: 10 }}>
											{i18n.t("ticketOptionsMenu.appointmentsModal.title")}
										</Typography>
										<ContactNotes ticket={ticket} />
									</Paper>

									<Paper square variant="outlined" className={classes.contactDetails}>
										<ContactModal
											open={modalOpen}
											onClose={() => setModalOpen(false)}
											contactId={contact.id}
										></ContactModal>
										<Typography variant="subtitle1">
											{i18n.t("contactDrawer.extraInfo")}
										</Typography>
										{contact?.extraInfo?.map(info => (
											<Paper
												key={info.id}
												square
												variant="outlined"
												className={classes.contactExtraInfo}
											>
												<InputLabel>{info.name}</InputLabel>
												<Typography component="div" noWrap style={{ paddingTop: 2 }}>
													<MarkdownWrapper>{info.value}</MarkdownWrapper>
												</Typography>
											</Paper>
										))}
									</Paper>
								</TabPanel>

								{/* TabPanels das Mídias */}
								<TabPanel value={tabValue} index={1} classes={classes}>
									{loadingMedia ? (
										<div className={classes.loadingContainer}>
											<CircularProgress />
										</div>
									) : (
										mediaData.images.length === 0 ? (
											<div className={classes.emptyState}>
												<Typography variant="body2">Nenhuma imagem encontrada</Typography>
											</div>
										) : (
											<Grid container spacing={1} className={classes.mediaGrid}>
												{mediaData.images.map((item, index) => (
													<Grid item xs={4} key={index}>
														<Paper
															className={classes.mediaItem}
															elevation={1}
															onClick={() => window.open(item.mediaUrl, '_blank')}
														>
															<img
																src={item.mediaUrl}
																alt=""
																className={classes.mediaThumbnail}
															/>
														</Paper>
													</Grid>
												))}
											</Grid>
										)
									)}
								</TabPanel>

								<TabPanel value={tabValue} index={2} classes={classes}>
									{loadingMedia ? (
										<div className={classes.loadingContainer}>
											<CircularProgress />
										</div>
									) : (
										mediaData.videos.length === 0 ? (
											<div className={classes.emptyState}>
												<Typography variant="body2">Nenhum vídeo encontrado</Typography>
											</div>
										) : (
											<Grid container spacing={1} className={classes.mediaGrid}>
												{mediaData.videos.map((item, index) => (
													<Grid item xs={4} key={index}>
														<Paper
															className={classes.mediaItem}
															elevation={1}
															onClick={() => window.open(item.mediaUrl, '_blank')}
														>
															<Box display="flex" flexDirection="column" alignItems="center">
																<VideocamIcon className={classes.mediaIcon} />
																<Typography variant="caption" style={{ marginTop: 4 }}>
																	{new Date(item.createdAt).toLocaleDateString('pt-BR')}
																</Typography>
															</Box>
														</Paper>
													</Grid>
												))}
											</Grid>
										)
									)}
								</TabPanel>

								<TabPanel value={tabValue} index={3} classes={classes}>
									{loadingMedia ? (
										<div className={classes.loadingContainer}>
											<CircularProgress />
										</div>
									) : (
										mediaData.audios.length === 0 ? (
											<div className={classes.emptyState}>
												<Typography variant="body2">Nenhum áudio encontrado</Typography>
											</div>
										) : (
											<Grid container spacing={1} className={classes.mediaGrid}>
												{mediaData.audios.map((item, index) => (
													<Grid item xs={4} key={index}>
														<Paper
															className={classes.mediaItem}
															elevation={1}
															onClick={() => window.open(item.mediaUrl, '_blank')}
														>
															<Box display="flex" flexDirection="column" alignItems="center">
																<AudiotrackIcon className={classes.mediaIcon} />
																<Typography variant="caption" style={{ marginTop: 4 }}>
																	{new Date(item.createdAt).toLocaleDateString('pt-BR')}
																</Typography>
															</Box>
														</Paper>
													</Grid>
												))}
											</Grid>
										)
									)}
								</TabPanel>

								<TabPanel value={tabValue} index={4} classes={classes}>
									{loadingMedia ? (
										<div className={classes.loadingContainer}>
											<CircularProgress />
										</div>
									) : (
										mediaData.documents.length === 0 ? (
											<div className={classes.emptyState}>
												<Typography variant="body2">Nenhum documento encontrado</Typography>
											</div>
										) : (
											<List>
												{mediaData.documents.map((doc, index) => (
													<ListItem
														key={index}
														button
														className={classes.linkItem}
														onClick={() => window.open(doc.mediaUrl, '_blank')}
													>
														<ListItemIcon>
															<InsertDriveFileIcon />
														</ListItemIcon>
														<ListItemText
															primary={doc.body || `Documento ${index + 1}`}
															secondary={new Date(doc.createdAt).toLocaleDateString('pt-BR')}
														/>
													</ListItem>
												))}
											</List>
										)
									)}
								</TabPanel>

								<TabPanel value={tabValue} index={5} classes={classes}>
									{loadingMedia ? (
										<div className={classes.loadingContainer}>
											<CircularProgress />
										</div>
									) : (
										mediaData.links.length === 0 ? (
											<div className={classes.emptyState}>
												<Typography variant="body2">Nenhum link encontrado</Typography>
											</div>
										) : (
											<List>
												{mediaData.links.map((link, index) => (
													<ListItem
														key={index}
														button
														className={classes.linkItem}
														onClick={() => window.open(link.url, '_blank')}
													>
														<ListItemIcon>
															<LinkIcon />
														</ListItemIcon>
														<ListItemText
															primary={link.title || link.url}
															secondary={new Date(link.createdAt).toLocaleDateString('pt-BR')}
														/>
													</ListItem>
												))}
											</List>
										)
									)}
								</TabPanel>

							{/* TabPanel dos Participantes - ÍNDICE 6 */}
							{contact.isGroup && (
								<TabPanel value={tabValue} index={6} classes={classes}>
									<div className={classes.exportButtonContainer}>
										<Typography variant="h6" style={{ display: 'flex', alignItems: 'center' }}>
											<GroupIcon style={{ marginRight: 8 }} />
											Participantes do Grupo ({participants.length})
										</Typography>
									<Button
										variant="outlined"
										color="primary"
										size="small"
										startIcon={<GetAppIcon />}
										onClick={handleExportParticipants}
										className={classes.exportButton}
										disabled={participants.length === 0}
									>
										Exportar
									</Button>
									</div>
									{renderParticipants()}
								</TabPanel>
							)}
							</>
						)}
					</div>
				</div>
			</Drawer>

			{/* Modal da Imagem */}
			<Dialog
				open={imageModalOpen}
				onClose={handleImageModalClose}
				className={classes.imageModal}
				maxWidth="md"
				fullWidth
			>
				<DialogContent className={classes.imageModalContent}>
					<img
						src={(function(){const u=(contact?.urlPicture||contact?.profilePicUrl)||"";const b=(getBackendUrl&&getBackendUrl());if(!u)return "";if(/^(data:|blob:|https?:\/\/)/i.test(u))return u;return u.startsWith("/")?`${b}${u}`:`${b}/public/${u}`;})()}
						alt={contact?.name || "Foto do contato"}
						className={classes.expandedImage}
						onError={(e)=>{e.target.onerror=null;e.target.src=((getBackendUrl&&getBackendUrl()))+"/public/app/noimage.png";}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ContactDrawer;
